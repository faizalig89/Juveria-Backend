import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  lookup,
} from 'node:dns/promises';
import {
  isIP,
} from 'node:net';
import type {
  ConnectionContext,
  ExternalInvoiceRecord,
  IntegrationObject,
  IntegrationProvider,
  SubmissionStatusWriteback,
} from './integration.types.js';

type HttpOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
};

type JsonResponse = {
  status: number;
  text: string;
  body: unknown;
};

type StatusWritebackMethod =
  'PATCH' |
  'POST';

type StatusWritebackConfig = {
  pathTemplate: string;
  method: StatusWritebackMethod;
  payloadTemplate: IntegrationObject;
  statusMap: IntegrationObject;
  headers: Record<string, string>;
};

@Injectable()
export class IntegrationProviderService {
  private readonly maxResponseBytes =
    5 * 1024 * 1024;

  providers(): {
    provider: IntegrationProvider;
    name: string;
    capabilities: {
      testConnection: boolean;
      pullInvoices: boolean;
      pushSubmissionStatus: boolean;
    };
  }[] {
    return [
      this.providerRow(
        'MICROSOFT_BUSINESS_CENTRAL',
        'Microsoft Dynamics 365 Business Central',
      ),
      this.providerRow(
        'MICROSOFT_D365_FINANCE',
        'Microsoft Dynamics 365 Finance',
      ),
      this.providerRow(
        'SAP_S4HANA',
        'SAP S/4HANA',
      ),
      this.providerRow(
        'SAP_BUSINESS_ONE',
        'SAP Business One',
      ),
      this.providerRow(
        'ORACLE_FUSION',
        'Oracle Fusion Cloud Financials',
      ),
      this.providerRow(
        'NETSUITE',
        'Oracle NetSuite',
        {
          testConnection: false,
          pullInvoices: false,
          pushSubmissionStatus: false,
        },
      ),
      this.providerRow(
        'EPICOR_KINETIC',
        'Epicor Kinetic',
        {
          testConnection: false,
          pullInvoices: false,
          pushSubmissionStatus: false,
        },
      ),
      this.providerRow(
        'ZOHO_BOOKS',
        'Zoho Books',
        {
          testConnection: false,
          pullInvoices: false,
          pushSubmissionStatus: false,
        },
      ),
    ];
  }

  async test(
    context: ConnectionContext,
  ) {
    switch (context.provider) {
      case 'MICROSOFT_BUSINESS_CENTRAL':
        return this.testBusinessCentral(
          context,
        );
      case 'MICROSOFT_D365_FINANCE':
        return this.testD365Finance(
          context,
        );
      case 'SAP_S4HANA':
        return this.testSapS4(
          context,
        );
      case 'SAP_BUSINESS_ONE':
        return this.testSapBusinessOne(
          context,
        );
      case 'ORACLE_FUSION':
        return this.testOracleFusion(
          context,
        );
      default:
        throw new BadRequestException(
          'Unsupported integration provider',
        );
    }
  }

  async pullInvoices(
    context: ConnectionContext,
    limit: number,
  ): Promise<
    ExternalInvoiceRecord[]
  > {
    switch (context.provider) {
      case 'MICROSOFT_BUSINESS_CENTRAL':
        return this.pullBusinessCentral(
          context,
          limit,
        );
      case 'MICROSOFT_D365_FINANCE':
        return this.pullD365Finance(
          context,
          limit,
        );
      case 'SAP_S4HANA':
        return this.pullSapS4(
          context,
          limit,
        );
      case 'SAP_BUSINESS_ONE':
        return this.pullSapBusinessOne(
          context,
          limit,
        );
      case 'ORACLE_FUSION':
        return this.pullOracleFusion(
          context,
          limit,
        );
      default:
        throw new BadRequestException(
          'Unsupported integration provider',
        );
    }
  }

  validateStatusWriteback(
    context: ConnectionContext,
  ) {
    const config =
      this.statusWritebackConfig(
        context,
      );

    return {
      enabled:
        true as const,
      method:
        config.method,
      pathConfigured:
        true as const,
      payloadConfigured:
        true as const,
    };
  }

  async pushSubmissionStatus(
    context: ConnectionContext,
    writeback: SubmissionStatusWriteback,
  ) {
    const config =
      this.statusWritebackConfig(
        context,
      );

    const path =
      this.renderTemplate(
        config.pathTemplate,
        writeback,
        config.statusMap,
      );

    const payload =
      this.renderTemplateValue(
        config.payloadTemplate,
        writeback,
        config.statusMap,
      );

    const baseHeaders = {
      ...config.headers,
      'content-type':
        'application/json',
      accept:
        'application/json',
    };

    switch (context.provider) {
      case 'MICROSOFT_BUSINESS_CENTRAL': {
        const token =
          await this.microsoftToken(
            context,
            'https://api.businesscentral.dynamics.com/.default',
          );

        await this.requestJson(
          this.buildUrl(
            context.baseUrl,
            path,
          ),
          {
            method:
              config.method,
            headers: {
              ...baseHeaders,
              authorization:
                `Bearer ${token}`,
            },
            body:
              JSON.stringify(
                payload,
              ),
          },
        );

        break;
      }

      case 'MICROSOFT_D365_FINANCE': {
        const token =
          await this.microsoftToken(
            context,
            `${new URL(
              context.baseUrl,
            ).origin}/.default`,
          );

        await this.requestJson(
          this.buildUrl(
            context.baseUrl,
            path,
          ),
          {
            method:
              config.method,
            headers: {
              ...baseHeaders,
              authorization:
                `Bearer ${token}`,
            },
            body:
              JSON.stringify(
                payload,
              ),
          },
        );

        break;
      }

      case 'SAP_S4HANA': {
        const headers =
          await this.sapOrOracleHeaders(
            context,
          );

        await this.requestJson(
          this.buildUrl(
            context.baseUrl,
            path,
          ),
          {
            method:
              config.method,
            headers: {
              ...headers,
              ...baseHeaders,
            },
            body:
              JSON.stringify(
                payload,
              ),
          },
        );

        break;
      }

      case 'SAP_BUSINESS_ONE': {
        const cookie =
          await this.sapB1Login(
            context,
          );

        try {
          await this.requestJson(
            this.buildUrl(
              context.baseUrl,
              path,
            ),
            {
              method:
                config.method,
              headers: {
                ...baseHeaders,
                cookie,
              },
              body:
                JSON.stringify(
                  payload,
                ),
            },
          );
        } finally {
          await this.sapB1Logout(
            context,
            cookie,
          );
        }

        break;
      }

      case 'ORACLE_FUSION': {
        const headers =
          await this.sapOrOracleHeaders(
            context,
          );

        await this.requestJson(
          this.buildUrl(
            context.baseUrl,
            path,
          ),
          {
            method:
              config.method,
            headers: {
              ...headers,
              ...baseHeaders,
              'REST-Framework-Version':
                '4',
            },
            body:
              JSON.stringify(
                payload,
              ),
          },
        );

        break;
      }

      default:
        throw new BadRequestException(
          'Unsupported integration provider',
        );
    }

    return {
      ok:
        true as const,
      provider:
        context.provider,
      externalInvoiceId:
        writeback.externalInvoiceId,
      submissionId:
        writeback.submissionId,
      status:
        writeback.status,
      mappedStatus:
        this.mappedStatus(
          writeback.status,
          config.statusMap,
        ),
      pushedAt:
        new Date()
          .toISOString(),
    };
  }

  private providerRow(
    provider: IntegrationProvider,
    name: string,
    capabilities: {
      testConnection: boolean;
      pullInvoices: boolean;
      pushSubmissionStatus: boolean;
    } = {
      testConnection: true,
      pullInvoices: true,
      pushSubmissionStatus: true,
    },
  ) {
    return {
      provider,
      name,
      capabilities,
    };
  }

  private async testBusinessCentral(
    context: ConnectionContext,
  ) {
    const token =
      await this.microsoftToken(
        context,
        'https://api.businesscentral.dynamics.com/.default',
      );

    const url =
      this.buildUrl(
        context.baseUrl,
        'companies?$top=1',
      );

    const response =
      await this.requestJson(
        url,
        {
          headers: {
            authorization:
              `Bearer ${token}`,
            accept:
              'application/json',
          },
        },
      );

    return {
      ok: true as const,
      provider:
        context.provider,
      message:
        'Business Central API connection succeeded',
      metadata: {
        sampleCount:
          this.items(
            response.body,
          ).length,
      },
    };
  }

  private async testD365Finance(
    context: ConnectionContext,
  ) {
    const token =
      await this.microsoftToken(
        context,
        `${new URL(
          context.baseUrl,
        ).origin}/.default`,
      );

    const url =
      this.buildUrl(
        context.baseUrl,
        'data/$metadata',
      );

    await this.requestText(
      url,
      {
        headers: {
          authorization:
            `Bearer ${token}`,
          accept:
            'application/xml,text/xml,*/*',
        },
      },
    );

    return {
      ok: true as const,
      provider:
        context.provider,
      message:
        'Dynamics 365 Finance OData connection succeeded',
    };
  }

  private async testSapS4(
    context: ConnectionContext,
  ) {
    const headers =
      await this.sapOrOracleHeaders(
        context,
      );

    const metadataPath =
      this.optionalString(
        context.config,
        'metadataPath',
      ) ??
      'sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/$metadata';

    await this.requestText(
      this.buildUrl(
        context.baseUrl,
        metadataPath,
      ),
      {
        headers: {
          ...headers,
          accept:
            'application/xml,text/xml,*/*',
        },
      },
    );

    return {
      ok: true as const,
      provider:
        context.provider,
      message:
        'SAP S/4HANA OData connection succeeded',
    };
  }

  private async testSapBusinessOne(
    context: ConnectionContext,
  ) {
    const cookie =
      await this.sapB1Login(
        context,
      );

    try {
      await this.requestText(
        this.buildUrl(
          context.baseUrl,
          'b1s/v2/$metadata',
        ),
        {
          headers: {
            cookie,
            accept:
              'application/xml,text/xml,*/*',
          },
        },
      );

      return {
        ok: true as const,
        provider:
          context.provider,
        message:
          'SAP Business One Service Layer connection succeeded',
      };
    } finally {
      await this.sapB1Logout(
        context,
        cookie,
      );
    }
  }

  private async testOracleFusion(
    context: ConnectionContext,
  ) {
    const headers =
      await this.sapOrOracleHeaders(
        context,
      );

    const resourcePath =
      this.optionalString(
        context.config,
        'receivablesResourcePath',
      ) ??
      'fscmRestApi/resources/11.13.18.05/receivablesInvoices';

    await this.requestJson(
      this.buildUrl(
        context.baseUrl,
        `${resourcePath}?limit=1`,
      ),
      {
        headers: {
          ...headers,
          'REST-Framework-Version':
            '4',
        },
      },
    );

    return {
      ok: true as const,
      provider:
        context.provider,
      message:
        'Oracle Fusion Financials connection succeeded',
    };
  }

  private async pullBusinessCentral(
    context: ConnectionContext,
    limit: number,
  ): Promise<
    ExternalInvoiceRecord[]
  > {
    const token =
      await this.microsoftToken(
        context,
        'https://api.businesscentral.dynamics.com/.default',
      );

    const companyId =
      this.requireString(
        context.config,
        'companyId',
      );

    const path =
      `companies(${encodeURIComponent(
        companyId,
      )})/salesInvoices?$top=${limit}&$orderby=lastModifiedDateTime desc&$expand=salesInvoiceLines`;

    const response =
      await this.requestJson(
        this.buildUrl(
          context.baseUrl,
          path,
        ),
        {
          headers: {
            authorization:
              `Bearer ${token}`,
            accept:
              'application/json',
          },
        },
      );

    return this.items(
      response.body,
    ).map(
      raw =>
        this.mapBusinessCentral(
          context,
          raw,
        ),
    );
  }

  private async pullD365Finance(
    context: ConnectionContext,
    limit: number,
  ): Promise<
    ExternalInvoiceRecord[]
  > {
    const token =
      await this.microsoftToken(
        context,
        `${new URL(
          context.baseUrl,
        ).origin}/.default`,
      );

    const entityPath =
      this.optionalString(
        context.config,
        'invoiceEntityPath',
      ) ??
      'data/SalesInvoiceHeadersV2';

    const lineEntityPath =
      this.optionalString(
        context.config,
        'invoiceLineEntityPath',
      ) ??
      'data/SalesInvoiceLinesV3';

    const response =
      await this.requestJson(
        this.buildUrl(
          context.baseUrl,
          `${entityPath}?$top=${limit}&$orderby=InvoiceDate desc`,
        ),
        {
          headers: {
            authorization:
              `Bearer ${token}`,
            accept:
              'application/json',
          },
        },
      );

    const records:
      ExternalInvoiceRecord[] = [];

    for (
      const header
      of this.items(
        response.body,
      )
    ) {
      const invoiceNumber =
        this.requireAnyString(
          header,
          [
            'InvoiceNumber',
            'InvoiceId',
          ],
          'invoice number',
        );

      const dataAreaId =
        this.anyString(
          header,
          [
            'dataAreaId',
            'DataAreaId',
          ],
        );

      const filters = [
        `InvoiceNumber eq '${this.escapeODataString(
          invoiceNumber,
        )}'`,
      ];

      if (dataAreaId) {
        filters.push(
          `dataAreaId eq '${this.escapeODataString(
            dataAreaId,
          )}'`,
        );
      }

      const lineResponse =
        await this.requestJson(
          this.buildUrl(
            context.baseUrl,
            `${lineEntityPath}?$filter=${encodeURIComponent(
              filters.join(
                ' and ',
              ),
            )}`,
          ),
          {
            headers: {
              authorization:
                `Bearer ${token}`,
              accept:
                'application/json',
            },
          },
        );

      records.push(
        this.mapD365Finance(
          context,
          {
            ...header,
            SalesInvoiceLines:
              this.items(
                lineResponse.body,
              ),
          },
        ),
      );
    }

    return records;
  }

  private async pullSapS4(
    context: ConnectionContext,
    limit: number,
  ): Promise<
    ExternalInvoiceRecord[]
  > {
    const headers =
      await this.sapOrOracleHeaders(
        context,
      );

    const root =
      this.optionalString(
        context.config,
        'billingServiceRoot',
      ) ??
      'sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV';

    const response =
      await this.requestJson(
        this.buildUrl(
          context.baseUrl,
          `${root}/A_BillingDocument?$top=${limit}&$orderby=BillingDocumentDate desc&$expand=to_Item&$format=json`,
        ),
        { headers },
      );

    return this.items(
      response.body,
    ).map(
      raw =>
        this.mapSapS4(
          context,
          raw,
        ),
    );
  }

  private async pullSapBusinessOne(
    context: ConnectionContext,
    limit: number,
  ): Promise<
    ExternalInvoiceRecord[]
  > {
    const cookie =
      await this.sapB1Login(
        context,
      );

    try {
      const response =
        await this.requestJson(
          this.buildUrl(
            context.baseUrl,
            `b1s/v2/Invoices?$top=${limit}&$orderby=DocDate desc`,
          ),
          {
            headers: {
              cookie,
              accept:
                'application/json',
            },
          },
        );

      return this.items(
        response.body,
      ).map(
        raw =>
          this.mapSapBusinessOne(
            context,
            raw,
          ),
      );
    } finally {
      await this.sapB1Logout(
        context,
        cookie,
      );
    }
  }

  private async pullOracleFusion(
    context: ConnectionContext,
    limit: number,
  ): Promise<
    ExternalInvoiceRecord[]
  > {
    const headers =
      await this.sapOrOracleHeaders(
        context,
      );

    const resourcePath =
      this.optionalString(
        context.config,
        'receivablesResourcePath',
      ) ??
      'fscmRestApi/resources/11.13.18.05/receivablesInvoices';

    const response =
      await this.requestJson(
        this.buildUrl(
          context.baseUrl,
          `${resourcePath}?limit=${limit}&orderBy=TransactionDate:desc&expand=receivablesInvoiceLines`,
        ),
        {
          headers: {
            ...headers,
            'REST-Framework-Version':
              '4',
          },
        },
      );

    return this.items(
      response.body,
    ).map(
      raw =>
        this.mapOracleFusion(
          context,
          raw,
        ),
    );
  }

  private mapBusinessCentral(
    context: ConnectionContext,
    raw: IntegrationObject,
  ): ExternalInvoiceRecord {
    const invoiceNumber =
      this.requireAnyString(
        raw,
        [
          'number',
          'invoiceNumber',
        ],
        'invoice number',
      );

    const total =
      this.requireAnyNumber(
        raw,
        [
          'totalAmountIncludingTax',
          'totalAmount',
        ],
        'invoice total',
      );

    const lines =
      this.lineArray(
        raw.salesInvoiceLines,
      ).map(
        (line, index) =>
          this.canonicalLine(
            line,
            index,
            {
              description: [
                'description',
                'description2',
              ],
              quantity: [
                'quantity',
              ],
              unitPrice: [
                'unitPrice',
              ],
              taxAmount: [
                'totalTaxAmount',
                'taxAmount',
              ],
              lineNet: [
                'amountExcludingTax',
                'netAmount',
              ],
              lineTotal: [
                'amountIncludingTax',
                'netAmountIncludingTax',
              ],
              taxRate: [
                'taxPercent',
                'taxRate',
              ],
              unitCode: [
                'unitOfMeasureCode',
              ],
              identifier: [
                'sequence',
                'id',
              ],
            },
            context,
          ),
      );

    return {
      externalId:
        this.requireAnyString(
          raw,
          ['id'],
          'external invoice id',
        ),
      externalInvoiceNumber:
        invoiceNumber,
      externalStatus:
        this.anyString(
          raw,
          ['status'],
        ),
      externalVersion:
        this.anyString(
          raw,
          [
            '@odata.etag',
            'lastModifiedDateTime',
          ],
        ),
      invoice:
        this.canonicalInvoice(
          context,
          {
            invoiceNumber,
            invoiceDate:
              this.requireDate(
                raw,
                [
                  'invoiceDate',
                  'postingDate',
                ],
              ),
            currency:
              this.anyString(
                raw,
                ['currencyCode'],
              ) ?? 'AED',
            totalAmount:
              total,
            paymentDueDate:
              this.dateOrUndefined(
                this.anyString(
                  raw,
                  ['dueDate'],
                ),
              ),
            totalWithoutTax:
              this.anyNumber(
                raw,
                [
                  'totalAmountExcludingTax',
                ],
              ),
            totalTaxAmount:
              this.anyNumber(
                raw,
                ['totalTaxAmount'],
              ),
            totalWithTax:
              total,
            amountDue:
              this.anyNumber(
                raw,
                ['remainingAmount'],
              ) ?? total,
            buyer: {
              name:
                this.anyString(
                  raw,
                  [
                    'billToName',
                    'customerName',
                  ],
                ),
              addressLine1:
                this.anyString(
                  raw,
                  [
                    'billToAddressLine1',
                    'sellToAddressLine1',
                  ],
                ),
              city:
                this.anyString(
                  raw,
                  [
                    'billToCity',
                    'sellToCity',
                  ],
                ),
              countrySubdivision:
                this.anyString(
                  raw,
                  [
                    'billToState',
                    'sellToState',
                  ],
                ),
              countryCode:
                this.anyString(
                  raw,
                  [
                    'billToCountry',
                    'sellToCountry',
                  ],
                ),
            },
            lines,
          },
        ),
      metadata: {
        source:
          'Microsoft Business Central API',
      },
    };
  }

  private mapD365Finance(
    context: ConnectionContext,
    raw: IntegrationObject,
  ): ExternalInvoiceRecord {
    const invoiceNumber =
      this.requireAnyString(
        raw,
        [
          'InvoiceNumber',
          'InvoiceId',
        ],
        'invoice number',
      );

    const total =
      this.requireAnyNumber(
        raw,
        [
          'TotalInvoiceAmount',
          'InvoiceAmount',
          'TotalAmount',
        ],
        'invoice total',
      );

    const embeddedLines =
      this.lineArray(
        raw.SalesInvoiceLines ??
        raw.InvoiceLines ??
        raw.lines,
      ).map(
        (line, index) =>
          this.canonicalLine(
            line,
            index,
            {
              description: [
                'LineDescription',
                'ProductName',
                'ItemDescription',
              ],
              quantity: [
                'SalesQuantity',
                'Quantity',
              ],
              unitPrice: [
                'SalesPrice',
                'UnitPrice',
              ],
              taxAmount: [
                'SalesTaxAmount',
                'TaxAmount',
              ],
              lineNet: [
                'LineAmount',
                'NetAmount',
              ],
              lineTotal: [
                'LineAmount',
                'NetAmount',
              ],
              taxRate: [
                'SalesTaxRate',
                'TaxRate',
              ],
              unitCode: [
                'SalesUnitSymbol',
                'UnitSymbol',
              ],
              identifier: [
                'LineNumber',
                'RecId',
              ],
            },
            context,
          ),
      );

    return {
      externalId:
        this.anyString(
          raw,
          [
            'RecId',
            'InvoiceNumber',
          ],
        ) ??
        invoiceNumber,
      externalInvoiceNumber:
        invoiceNumber,
      externalStatus:
        this.anyString(
          raw,
          [
            'InvoiceStatus',
            'Status',
          ],
        ),
      externalVersion:
        this.anyString(
          raw,
          ['@odata.etag'],
        ),
      invoice:
        this.canonicalInvoice(
          context,
          {
            invoiceNumber,
            invoiceDate:
              this.requireDate(
                raw,
                ['InvoiceDate'],
              ),
            currency:
              this.anyString(
                raw,
                ['CurrencyCode'],
              ) ?? 'AED',
            totalAmount:
              total,
            totalTaxAmount:
              this.anyNumber(
                raw,
                [
                  'TotalTaxAmount',
                  'InvoiceHeaderTaxAmount',
                ],
              ),
            totalWithTax:
              total,
            amountDue:
              total,
            buyer: {
              name:
                this.anyString(
                  raw,
                  [
                    'InvoiceCustomerName',
                    'CustomerName',
                    'InvoiceCustomerAccountNumber',
                  ],
                ),
              addressLine1:
                this.anyString(
                  raw,
                  ['InvoiceAddressStreet'],
                ),
              city:
                this.anyString(
                  raw,
                  ['InvoiceAddressCity'],
                ),
              countrySubdivision:
                this.anyString(
                  raw,
                  ['InvoiceAddressState'],
                ),
              countryCode:
                this.anyString(
                  raw,
                  [
                    'InvoiceAddressCountryRegionISOCode',
                    'InvoiceAddressCountryRegionId',
                  ],
                ),
            },
            lines:
              embeddedLines,
          },
        ),
      metadata: {
        source:
          'Microsoft Dynamics 365 Finance OData',
      },
    };
  }

  private mapSapS4(
    context: ConnectionContext,
    raw: IntegrationObject,
  ): ExternalInvoiceRecord {
    const billingDocument =
      this.requireAnyString(
        raw,
        ['BillingDocument'],
        'billing document',
      );

    const lineSource =
      this.objectOrUndefined(
        raw.to_Item,
      );

    const lines =
      this.lineArray(
        lineSource?.results ??
        lineSource?.value ??
        raw.to_Item,
      ).map(
        (line, index) =>
          this.canonicalLine(
            line,
            index,
            {
              description: [
                'BillingDocumentItemText',
                'Material',
              ],
              quantity: [
                'BillingQuantity',
              ],
              unitPrice: [
                'NetPriceAmount',
                'ConditionRateValue',
              ],
              taxAmount: [
                'TaxAmount',
              ],
              lineNet: [
                'NetAmount',
              ],
              lineTotal: [
                'GrossAmount',
                'NetAmount',
              ],
              taxRate: [
                'TaxRate',
              ],
              unitCode: [
                'BillingQuantityUnit',
              ],
              identifier: [
                'BillingDocumentItem',
              ],
            },
            context,
          ),
      );

    const net =
      this.anyNumber(
        raw,
        [
          'TotalNetAmount',
          'NetAmount',
        ],
      );

    const tax =
      this.anyNumber(
        raw,
        [
          'TaxAmount',
          'TotalTaxAmount',
        ],
      );

    const total =
      this.anyNumber(
        raw,
        [
          'TotalGrossAmount',
          'TotalAmount',
        ],
      ) ??
      (
        net !== undefined
          ? net +
            (tax ?? 0)
          : this.requireAnyNumber(
              raw,
              [
                'TotalNetAmount',
              ],
              'invoice total',
            )
      );

    return {
      externalId:
        billingDocument,
      externalInvoiceNumber:
        billingDocument,
      externalStatus:
        this.anyString(
          raw,
          [
            'AccountingDocumentStatus',
            'BillingDocumentIsCancelled',
          ],
        ),
      externalVersion:
        this.anyString(
          raw,
          ['@odata.etag'],
        ),
      invoice:
        this.canonicalInvoice(
          context,
          {
            invoiceNumber:
              billingDocument,
            invoiceDate:
              this.requireDate(
                raw,
                [
                  'BillingDocumentDate',
                  'BillingDocumentIssueDate',
                ],
              ),
            currency:
              this.anyString(
                raw,
                [
                  'TransactionCurrency',
                  'DocumentCurrency',
                ],
              ) ?? 'AED',
            totalAmount:
              total,
            totalWithoutTax:
              net,
            totalTaxAmount:
              tax,
            totalWithTax:
              total,
            amountDue:
              total,
            buyer: {
              name:
                this.anyString(
                  raw,
                  [
                    'SoldToParty',
                    'PayerParty',
                  ],
                ),
            },
            lines,
          },
        ),
      metadata: {
        source:
          'SAP S/4HANA Billing Document OData',
      },
    };
  }

  private mapSapBusinessOne(
    context: ConnectionContext,
    raw: IntegrationObject,
  ): ExternalInvoiceRecord {
    const externalId =
      this.requireAnyString(
        raw,
        ['DocEntry'],
        'SAP Business One DocEntry',
      );

    const invoiceNumber =
      this.requireAnyString(
        raw,
        ['DocNum'],
        'SAP Business One DocNum',
      );

    const total =
      this.requireAnyNumber(
        raw,
        ['DocTotal'],
        'invoice total',
      );

    const tax =
      this.anyNumber(
        raw,
        [
          'VatSum',
          'VatSumSys',
        ],
      );

    const lines =
      this.lineArray(
        raw.DocumentLines,
      ).map(
        (line, index) =>
          this.canonicalLine(
            line,
            index,
            {
              description: [
                'ItemDescription',
                'ItemCode',
              ],
              quantity: [
                'Quantity',
              ],
              unitPrice: [
                'UnitPrice',
                'Price',
              ],
              taxAmount: [
                'TaxTotal',
              ],
              lineNet: [
                'LineTotal',
              ],
              lineTotal: [
                'GrossTotal',
                'LineTotal',
              ],
              taxRate: [
                'TaxPercentagePerRow',
              ],
              unitCode: [
                'MeasureUnit',
              ],
              identifier: [
                'LineNum',
              ],
            },
            context,
          ),
      );

    return {
      externalId,
      externalInvoiceNumber:
        invoiceNumber,
      externalStatus:
        this.anyString(
          raw,
          [
            'DocumentStatus',
            'DocStatus',
          ],
        ),
      externalVersion:
        this.anyString(
          raw,
          [
            '@odata.etag',
            'UpdateDate',
          ],
        ),
      invoice:
        this.canonicalInvoice(
          context,
          {
            invoiceNumber,
            invoiceDate:
              this.requireDate(
                raw,
                [
                  'DocDate',
                  'TaxDate',
                ],
              ),
            currency:
              this.anyString(
                raw,
                ['DocCurrency'],
              ) ?? 'AED',
            totalAmount:
              total,
            paymentDueDate:
              this.dateOrUndefined(
                this.anyString(
                  raw,
                  ['DocDueDate'],
                ),
              ),
            totalWithoutTax:
              tax !== undefined
                ? total - tax
                : undefined,
            totalTaxAmount:
              tax,
            totalWithTax:
              total,
            amountDue:
              total,
            buyer: {
              name:
                this.anyString(
                  raw,
                  ['CardName'],
                ),
              addressLine1:
                this.anyString(
                  raw,
                  [
                    'Address',
                    'Address2',
                  ],
                ),
              taxIdentifier:
                this.anyString(
                  raw,
                  ['FederalTaxID'],
                ),
            },
            lines,
          },
        ),
      metadata: {
        source:
          'SAP Business One Service Layer',
      },
    };
  }

  private mapOracleFusion(
    context: ConnectionContext,
    raw: IntegrationObject,
  ): ExternalInvoiceRecord {
    const externalId =
      this.requireAnyString(
        raw,
        ['CustomerTransactionId'],
        'CustomerTransactionId',
      );

    const invoiceNumber =
      this.requireAnyString(
        raw,
        [
          'TransactionNumber',
          'DocumentNumber',
        ],
        'TransactionNumber',
      );

    const total =
      this.requireAnyNumber(
        raw,
        [
          'EnteredAmount',
          'OriginalAmount',
          'InvoiceAmount',
        ],
        'invoice total',
      );

    const transactionType =
      this.anyString(
        raw,
        ['TransactionType'],
      ) ?? '';

    const lines =
      this.lineArray(
        raw.receivablesInvoiceLines,
      ).map(
        (line, index) =>
          this.canonicalLine(
            line,
            index,
            {
              description: [
                'Description',
                'MemoLineName',
              ],
              quantity: [
                'Quantity',
              ],
              unitPrice: [
                'UnitSellingPrice',
              ],
              taxAmount: [
                'TaxAmount',
              ],
              lineNet: [
                'LineAmount',
                'ExtendedAmount',
              ],
              lineTotal: [
                'LineAmount',
                'ExtendedAmount',
              ],
              taxRate: [
                'TaxRate',
              ],
              unitCode: [
                'UOMCode',
              ],
              identifier: [
                'LineNumber',
                'CustomerTransactionLineId',
              ],
            },
            context,
          ),
      );

    const tax =
      this.anyNumber(
        raw,
        [
          'TaxAmount',
          'TotalTaxAmount',
        ],
      );

    return {
      externalId,
      externalInvoiceNumber:
        invoiceNumber,
      externalStatus:
        this.anyString(
          raw,
          ['InvoiceStatus'],
        ),
      externalVersion:
        this.anyString(
          raw,
          ['LastUpdateDate'],
        ),
      invoice:
        this.canonicalInvoice(
          context,
          {
            invoiceNumber,
            invoiceDate:
              this.requireDate(
                raw,
                [
                  'TransactionDate',
                  'BillingDate',
                ],
              ),
            currency:
              this.anyString(
                raw,
                ['InvoiceCurrencyCode'],
              ) ?? 'AED',
            totalAmount:
              total,
            invoiceTypeCode:
              /credit/i.test(
                transactionType,
              )
                ? '381'
                : '380',
            paymentDueDate:
              this.dateOrUndefined(
                this.anyString(
                  raw,
                  ['DueDate'],
                ),
              ),
            totalWithoutTax:
              tax !== undefined
                ? total - tax
                : undefined,
            totalTaxAmount:
              tax,
            totalWithTax:
              total,
            amountDue:
              this.anyNumber(
                raw,
                ['InvoiceBalanceAmount'],
              ) ?? total,
            buyer: {
              name:
                this.anyString(
                  raw,
                  [
                    'BillToCustomerName',
                    'ShipToCustomerName',
                    'BillToCustomerNumber',
                  ],
                ),
              taxIdentifier:
                this.anyString(
                  raw,
                  [
                    'ThirdPartyRegistrationNumber',
                    'ThirdPartyTaxRegistration',
                  ],
                ),
            },
            lines,
          },
        ),
      metadata: {
        source:
          'Oracle Fusion Receivables REST',
      },
    };
  }

  private canonicalInvoice(
    context: ConnectionContext,
    input: {
      invoiceNumber: string;
      invoiceDate: string;
      currency: string;
      totalAmount: number;
      invoiceTypeCode?: string;
      paymentDueDate?: string;
      totalWithoutTax?: number;
      totalTaxAmount?: number;
      totalWithTax?: number;
      amountDue?: number;
      buyer?: IntegrationObject;
      lines: IntegrationObject[];
    },
  ): IntegrationObject {
    const seller =
      this.objectOrUndefined(
        context.config.seller,
      );

    const parties = [
      ...(seller
        ? [
            {
              ...seller,
              role: 'SELLER',
            },
          ]
        : []),
      ...(input.buyer &&
      Object.values(
        input.buyer,
      ).some(
        value =>
          value !== undefined &&
          value !== null &&
          value !== '',
      )
        ? [
            {
              ...input.buyer,
              role: 'BUYER',
            },
          ]
        : []),
    ];

    const taxBreakdowns =
      this.taxBreakdowns(
        input.lines,
      );

    return {
      invoiceNumber:
        input.invoiceNumber,
      invoiceDate:
        input.invoiceDate,
      currency:
        input.currency.toUpperCase(),
      totalAmount:
        input.totalAmount,
      jurisdiction:
        this.optionalString(
          context.config,
          'jurisdiction',
        ) ?? 'AE',
      invoiceTypeCode:
        input.invoiceTypeCode ??
        this.optionalString(
          context.config,
          'invoiceTypeCode',
        ) ??
        '380',
      transactionTypeCode:
        this.optionalString(
          context.config,
          'transactionTypeCode',
        ) ??
        '00000000',
      businessProcessType:
        this.optionalString(
          context.config,
          'businessProcessType',
        ),
      specificationIdentifier:
        this.optionalString(
          context.config,
          'specificationIdentifier',
        ),
      paymentDueDate:
        input.paymentDueDate,
      lineNetTotal:
        this.sumDefined(
          input.lines,
          'lineNetAmount',
        ),
      totalWithoutTax:
        input.totalWithoutTax,
      totalTaxAmount:
        input.totalTaxAmount,
      totalWithTax:
        input.totalWithTax,
      amountDue:
        input.amountDue,
      parties:
        parties.length
          ? parties
          : undefined,
      taxBreakdowns:
        taxBreakdowns.length
          ? taxBreakdowns
          : undefined,
      lines:
        input.lines,
    };
  }

  private canonicalLine(
    raw: IntegrationObject,
    index: number,
    keys: {
      description: string[];
      quantity: string[];
      unitPrice: string[];
      taxAmount: string[];
      lineNet: string[];
      lineTotal: string[];
      taxRate: string[];
      unitCode: string[];
      identifier: string[];
    },
    context: ConnectionContext,
  ): IntegrationObject {
    const quantity =
      this.anyNumber(
        raw,
        keys.quantity,
      ) ?? 0;

    const unitPrice =
      this.anyNumber(
        raw,
        keys.unitPrice,
      ) ?? 0;

    const taxAmount =
      this.anyNumber(
        raw,
        keys.taxAmount,
      ) ?? 0;

    const net =
      this.anyNumber(
        raw,
        keys.lineNet,
      ) ??
      quantity * unitPrice;

    const total =
      this.anyNumber(
        raw,
        keys.lineTotal,
      ) ??
      net + taxAmount;

    const taxRate =
      this.anyNumber(
        raw,
        keys.taxRate,
      );

    const category =
      this.optionalString(
        context.config,
        'defaultTaxCategoryCode',
      ) ??
      (
        taxRate === 0
          ? 'Z'
          : 'S'
      );

    return {
      description:
        this.anyString(
          raw,
          keys.description,
        ) ??
        `ERP line ${index + 1}`,
      quantity,
      unitPrice,
      taxAmount,
      lineTotal:
        total,
      lineIdentifier:
        this.anyString(
          raw,
          keys.identifier,
        ) ??
        String(index + 1),
      unitOfMeasureCode:
        this.anyString(
          raw,
          keys.unitCode,
        ),
      lineNetAmount:
        net,
      itemNetPrice:
        unitPrice,
      taxCategoryCode:
        category,
      taxRate:
        taxRate ?? 0,
      itemName:
        this.anyString(
          raw,
          keys.description,
        ),
    };
  }

  private taxBreakdowns(
    lines: IntegrationObject[],
  ) {
    const groups =
      new Map<
        string,
        {
          taxableAmount: number;
          taxAmount: number;
          categoryCode: string;
          taxRate: number;
        }
      >();

    for (
      const line
      of lines
    ) {
      const categoryCode =
        this.anyString(
          line,
          ['taxCategoryCode'],
        ) ?? 'S';

      const taxRate =
        this.anyNumber(
          line,
          ['taxRate'],
        ) ?? 0;

      const taxableAmount =
        this.anyNumber(
          line,
          ['lineNetAmount'],
        ) ?? 0;

      const taxAmount =
        this.anyNumber(
          line,
          ['taxAmount'],
        ) ?? 0;

      const key =
        `${categoryCode}:${taxRate}`;

      const current =
        groups.get(key) ?? {
          taxableAmount: 0,
          taxAmount: 0,
          categoryCode,
          taxRate,
        };

      current.taxableAmount +=
        taxableAmount;
      current.taxAmount +=
        taxAmount;

      groups.set(
        key,
        current,
      );
    }

    return [
      ...groups.values(),
    ].map(
      group => ({
        ...group,
        taxableAmount:
          this.roundCurrency(
            group.taxableAmount,
          ),
        taxAmount:
          this.roundCurrency(
            group.taxAmount,
          ),
      }),
    );
  }

  private sumDefined(
    rows: IntegrationObject[],
    key: string,
  ) {
    if (!rows.length) {
      return undefined;
    }

    return this.roundCurrency(
      rows.reduce(
        (sum, row) =>
          sum +
          (
            this.anyNumber(
              row,
              [key],
            ) ?? 0
          ),
        0,
      ),
    );
  }

  private lineArray(
    value: unknown,
  ): IntegrationObject[] {
    if (Array.isArray(value)) {
      return value.map(
        item =>
          this.object(item),
      );
    }

    const object =
      this.objectOrUndefined(
        value,
      );

    if (
      object &&
      Array.isArray(
        object.value,
      )
    ) {
      return object.value.map(
        item =>
          this.object(item),
      );
    }

    if (
      object &&
      Array.isArray(
        object.results,
      )
    ) {
      return object.results.map(
        item =>
          this.object(item),
      );
    }

    return [];
  }

  private roundCurrency(
    value: number,
  ) {
    return Math.round(
      (
        value +
        Number.EPSILON
      ) *
      100,
    ) / 100;
  }

  private requireDate(
    source: IntegrationObject,
    keys: string[],
  ) {
    const value =
      this.requireAnyString(
        source,
        keys,
        keys[0] ??
          'date',
      );

    const date =
      this.dateOrUndefined(
        value,
      );

    if (!date) {
      throw new BadGatewayException(
        'ERP invoice contains an invalid date',
      );
    }

    return date;
  }

  private dateOrUndefined(
    value:
      string |
      undefined,
  ) {
    if (!value) {
      return undefined;
    }

    const isoMatch =
      /^(\d{4}-\d{2}-\d{2})/.exec(
        value,
      );

    if (isoMatch?.[1]) {
      return isoMatch[1];
    }

    const sapMatch =
      /Date\((\d+)\)/.exec(
        value,
      );

    if (sapMatch?.[1]) {
      const date =
        new Date(
          Number(
            sapMatch[1],
          ),
        );

      if (
        !Number.isNaN(
          date.getTime(),
        )
      ) {
        return date
          .toISOString()
          .slice(0, 10);
      }
    }

    return undefined;
  }

  private async sapB1Login(
    context: ConnectionContext,
  ): Promise<string> {
    if (
      context.authType !==
      'SAP_B1_SESSION'
    ) {
      throw new BadRequestException(
        'SAP Business One requires SAP_B1_SESSION authentication',
      );
    }

    const result =
      await this.requestJson(
        this.buildUrl(
          context.baseUrl,
          'b1s/v2/Login',
        ),
        {
          method:
            'POST',
          headers: {
            'content-type':
              'application/json',
            accept:
              'application/json',
          },
          body:
            JSON.stringify({
              CompanyDB:
                this.requireString(
                  context.credentials,
                  'companyDb',
                ),
              UserName:
                this.requireString(
                  context.credentials,
                  'username',
                ),
              Password:
                this.requireString(
                  context.credentials,
                  'password',
                ),
            }),
        },
      );

    const body =
      this.object(
        result.body,
      );

    const sessionId =
      this.optionalString(
        body,
        'SessionId',
      );

    if (!sessionId) {
      throw new BadGatewayException(
        'SAP Business One login did not return a session',
      );
    }

    return `B1SESSION=${sessionId}`;
  }

  private async sapB1Logout(
    context: ConnectionContext,
    cookie: string,
  ) {
    try {
      await this.requestText(
        this.buildUrl(
          context.baseUrl,
          'b1s/v2/Logout',
        ),
        {
          method:
            'POST',
          headers: {
            cookie,
          },
          timeoutMs:
            5000,
        },
      );
    } catch {
      // Session expiry must not mask the original provider operation.
    }
  }

  private async sapOrOracleHeaders(
    context: ConnectionContext,
  ) {
    if (
      context.authType ===
      'BASIC'
    ) {
      const username =
        this.requireString(
          context.credentials,
          'username',
        );

      const password =
        this.requireString(
          context.credentials,
          'password',
        );

      return {
        authorization:
          `Basic ${Buffer.from(
            `${username}:${password}`,
            'utf8',
          ).toString('base64')}`,
        accept:
          'application/json',
      };
    }

    if (
      context.authType !==
      'OAUTH_CLIENT_CREDENTIALS'
    ) {
      throw new BadRequestException(
        'Provider requires BASIC or OAUTH_CLIENT_CREDENTIALS authentication',
      );
    }

    const token =
      await this.genericToken(
        context,
      );

    return {
      authorization:
        `Bearer ${token}`,
      accept:
        'application/json',
    };
  }

  private async microsoftToken(
    context: ConnectionContext,
    scope: string,
  ) {
    const tenantId =
      this.requireString(
        context.config,
        'microsoftTenantId',
      );

    const tokenUrl =
      `https://login.microsoftonline.com/${encodeURIComponent(
        tenantId,
      )}/oauth2/v2.0/token`;

    return this.clientCredentialsToken(
      tokenUrl,
      this.requireString(
        context.credentials,
        'clientId',
      ),
      this.requireString(
        context.credentials,
        'clientSecret',
      ),
      scope,
    );
  }

  private async genericToken(
    context: ConnectionContext,
  ) {
    return this.clientCredentialsToken(
      this.requireString(
        context.config,
        'tokenUrl',
      ),
      this.requireString(
        context.credentials,
        'clientId',
      ),
      this.requireString(
        context.credentials,
        'clientSecret',
      ),
      this.optionalString(
        context.config,
        'scope',
      ),
    );
  }

  private async clientCredentialsToken(
    tokenUrl: string,
    clientId: string,
    clientSecret: string,
    scope?: string,
  ) {
    const form =
      new URLSearchParams({
        grant_type:
          'client_credentials',
        client_id:
          clientId,
        client_secret:
          clientSecret,
      });

    if (scope) {
      form.set(
        'scope',
        scope,
      );
    }

    const response =
      await this.requestJson(
        tokenUrl,
        {
          method:
            'POST',
          headers: {
            'content-type':
              'application/x-www-form-urlencoded',
            accept:
              'application/json',
          },
          body:
            form.toString(),
        },
      );

    const body =
      this.object(
        response.body,
      );

    const token =
      this.optionalString(
        body,
        'access_token',
      );

    if (!token) {
      throw new BadGatewayException(
        'OAuth token response did not contain an access token',
      );
    }

    return token;
  }

  private buildUrl(
    baseUrl: string,
    relativePath: string,
  ) {
    const base =
      this.httpsUrl(
        baseUrl,
      );

    if (
      !base.pathname.endsWith(
        '/',
      )
    ) {
      base.pathname += '/';
    }

    const target =
      new URL(
        relativePath.replace(
          /^\/+/,
          '',
        ),
        base,
      );

    if (
      target.origin !==
      base.origin
    ) {
      throw new BadRequestException(
        'ERP request changed origin',
      );
    }

    return target.toString();
  }

  private async requestJson(
    url: string,
    options:
      HttpOptions = {},
  ): Promise<JsonResponse> {
    const response =
      await this.requestText(
        url,
        options,
      );

    try {
      return {
        ...response,
        body:
          response.text.trim()
            ? JSON.parse(
                response.text,
              )
            : {},
      };
    } catch {
      throw new BadGatewayException(
        'ERP provider returned invalid JSON',
      );
    }
  }

  private async requestText(
    urlText: string,
    options:
      HttpOptions = {},
  ) {
    const url =
      this.httpsUrl(
        urlText,
      );

    await this.assertSafeTarget(
      url,
    );

    let response:
      Response;

    try {
      response =
        await fetch(
          url,
          {
            method:
              options.method ??
              'GET',
            headers:
              options.headers,
            body:
              options.body,
            redirect:
              'manual',
            signal:
              AbortSignal.timeout(
                options.timeoutMs ??
                15000,
              ),
          },
        );
    } catch {
      throw new BadGatewayException(
        'ERP provider request failed',
      );
    }

    if (
      response.status >=
        300 &&
      response.status <
        400
    ) {
      throw new BadGatewayException(
        'ERP provider redirect was blocked',
      );
    }

    const body =
      Buffer.from(
        await response.arrayBuffer(),
      );

    if (
      body.length >
      this.maxResponseBytes
    ) {
      throw new BadGatewayException(
        'ERP provider response is too large',
      );
    }

    if (!response.ok) {
      throw new BadGatewayException(
        `ERP provider returned HTTP ${response.status}`,
      );
    }

    return {
      status:
        response.status,
      text:
        body.toString(
          'utf8',
        ),
    };
  }

  private httpsUrl(
    value: string,
  ) {
    let url: URL;

    try {
      url =
        new URL(value);
    } catch {
      throw new BadRequestException(
        'Integration URL is invalid',
      );
    }

    if (
      url.protocol !==
      'https:'
    ) {
      throw new BadRequestException(
        'Integration URLs must use HTTPS',
      );
    }

    if (
      url.username ||
      url.password
    ) {
      throw new BadRequestException(
        'Integration URLs must not contain credentials',
      );
    }

    return url;
  }

  private async assertSafeTarget(
    url: URL,
  ) {
    if (
      process.env
        .ERP_ALLOW_PRIVATE_NETWORKS
        ?.trim()
        .toLowerCase() ===
      'true'
    ) {
      return;
    }

    const hostname =
      url.hostname
        .replace(
          /^\[/,
          '',
        )
        .replace(
          /\]$/,
          '',
        )
        .toLowerCase();

    if (
      hostname ===
        'localhost' ||
      hostname.endsWith(
        '.localhost',
      ) ||
      hostname.endsWith(
        '.local',
      )
    ) {
      throw new BadRequestException(
        'Private ERP network targets are disabled',
      );
    }

    if (
      isIP(hostname) &&
      this.privateAddress(
        hostname,
      )
    ) {
      throw new BadRequestException(
        'Private ERP network targets are disabled',
      );
    }

    let addresses:
      {
        address: string;
      }[];

    try {
      addresses =
        await lookup(
          hostname,
          {
            all:
              true,
            verbatim:
              true,
          },
        );
    } catch {
      throw new BadGatewayException(
        'ERP provider hostname could not be resolved',
      );
    }

    if (
      addresses.some(
        item =>
          this.privateAddress(
            item.address,
          ),
      )
    ) {
      throw new BadRequestException(
        'Private ERP network targets are disabled',
      );
    }
  }

  private privateAddress(
    address: string,
  ): boolean {
    const value =
      address.toLowerCase();

    if (
      value === '::1' ||
      value === '::'
    ) {
      return true;
    }

    if (
      value.startsWith(
        'fc',
      ) ||
      value.startsWith(
        'fd',
      ) ||
      value.startsWith(
        'fe8',
      ) ||
      value.startsWith(
        'fe9',
      ) ||
      value.startsWith(
        'fea',
      ) ||
      value.startsWith(
        'feb',
      )
    ) {
      return true;
    }

    if (
      value.startsWith(
        '::ffff:',
      )
    ) {
      return this.privateAddress(
        value.slice(7),
      );
    }

    if (
      isIP(value) !==
      4
    ) {
      return false;
    }

    const parts =
      value
        .split('.')
        .map(Number);

    const a =
      parts[0] ?? -1;

    const b =
      parts[1] ?? -1;

    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (
        a === 169 &&
        b === 254
      ) ||
      (
        a === 172 &&
        b >= 16 &&
        b <= 31
      ) ||
      (
        a === 192 &&
        b === 168
      ) ||
      (
        a === 100 &&
        b >= 64 &&
        b <= 127
      )
    );
  }

  private object(
    value: unknown,
  ): IntegrationObject {
    if (
      value === null ||
      typeof value !==
        'object' ||
      Array.isArray(value)
    ) {
      throw new BadGatewayException(
        'ERP provider returned an unexpected response',
      );
    }

    return value as
      IntegrationObject;
  }

  private objectOrUndefined(
    value: unknown,
  ): IntegrationObject | undefined {
    if (
      value === null ||
      value === undefined ||
      typeof value !==
        'object' ||
      Array.isArray(value)
    ) {
      return undefined;
    }

    return value as
      IntegrationObject;
  }

  private items(
    value: unknown,
  ): IntegrationObject[] {
    const root =
      this.object(
        value,
      );

    if (
      Array.isArray(
        root.value,
      )
    ) {
      return root.value.map(
        item =>
          this.object(item),
      );
    }

    if (
      Array.isArray(
        root.items,
      )
    ) {
      return root.items.map(
        item =>
          this.object(item),
      );
    }

    const d =
      this.objectOrUndefined(
        root.d,
      );

    if (
      d &&
      Array.isArray(
        d.results,
      )
    ) {
      return d.results.map(
        item =>
          this.object(item),
      );
    }

    return [];
  }

  private escapeODataString(
    value: string,
  ) {
    return value.replace(
      /'/g,
      "''",
    );
  }

  private statusWritebackConfig(
    context: ConnectionContext,
  ): StatusWritebackConfig {
    const raw =
      this.objectOrUndefined(
        context.config
          .statusWriteback,
      );

    if (!raw) {
      throw new BadRequestException(
        'Missing integration setting: statusWriteback',
      );
    }

    if (
      raw.enabled !==
      true
    ) {
      throw new BadRequestException(
        'ERP status write-back is not enabled for this connection',
      );
    }

    const pathTemplate =
      this.requireString(
        raw,
        'pathTemplate',
      );

    const methodValue =
      (
        this.optionalString(
          raw,
          'method',
        ) ??
        'PATCH'
      ).toUpperCase();

    if (
      methodValue !==
        'PATCH' &&
      methodValue !==
        'POST'
    ) {
      throw new BadRequestException(
        'statusWriteback.method must be PATCH or POST',
      );
    }

    const payloadTemplate =
      this.objectOrUndefined(
        raw.payload,
      );

    if (!payloadTemplate) {
      throw new BadRequestException(
        'Missing integration setting: statusWriteback.payload',
      );
    }

    const statusMap =
      this.objectOrUndefined(
        raw.statusMap,
      ) ?? {};

    const headers =
      this.safeStaticHeaders(
        this.objectOrUndefined(
          raw.headers,
        ),
      );

    return {
      pathTemplate,
      method:
        methodValue as
          StatusWritebackMethod,
      payloadTemplate,
      statusMap,
      headers,
    };
  }

  private safeStaticHeaders(
    raw:
      IntegrationObject |
      undefined,
  ): Record<string, string> {
    if (!raw) {
      return {};
    }

    const denied =
      new Set([
        'authorization',
        'cookie',
        'host',
        'content-length',
        'connection',
        'transfer-encoding',
        'proxy-authorization',
      ]);

    const headers:
      Record<string, string> = {};

    for (
      const [key, value]
      of Object.entries(raw)
    ) {
      const normalized =
        key.trim()
          .toLowerCase();

      if (
        !normalized ||
        denied.has(
          normalized,
        )
      ) {
        throw new BadRequestException(
          `statusWriteback header is not allowed: ${key}`,
        );
      }

      if (
        typeof value !==
          'string'
      ) {
        throw new BadRequestException(
          `statusWriteback header must be a string: ${key}`,
        );
      }

      headers[key] =
        value;
    }

    return headers;
  }

  private mappedStatus(
    status: string,
    statusMap:
      IntegrationObject,
  ) {
    const mapped =
      statusMap[
        status
      ];

    if (
      typeof mapped ===
        'string' &&
      mapped.trim()
    ) {
      return mapped.trim();
    }

    return status;
  }

  private renderTemplate(
    template: string,
    writeback:
      SubmissionStatusWriteback,
    statusMap:
      IntegrationObject,
  ) {
    const values =
      this.writebackValues(
        writeback,
        statusMap,
      );

    const rendered =
      template.replace(
        /\{([A-Za-z][A-Za-z0-9]*)\}/g,
        (
          _match,
          key: string,
        ) => {
          const value =
            values[key];

          if (
            value ===
            undefined
          ) {
            throw new BadRequestException(
              `Unknown status write-back placeholder: ${key}`,
            );
          }

          return encodeURIComponent(
            value,
          );
        },
      );

    if (
      /\{[A-Za-z][A-Za-z0-9]*\}/
        .test(
          rendered,
        )
    ) {
      throw new BadRequestException(
        'Unresolved status write-back path placeholder',
      );
    }

    return rendered;
  }

  private renderTemplateValue(
    value: unknown,
    writeback:
      SubmissionStatusWriteback,
    statusMap:
      IntegrationObject,
  ): unknown {
    const values =
      this.writebackValues(
        writeback,
        statusMap,
      );

    if (
      typeof value ===
        'string'
    ) {
      const whole =
        /^\{([A-Za-z][A-Za-z0-9]*)\}$/
          .exec(
            value,
          );

      if (
        whole?.[1]
      ) {
        const replacement =
          values[
            whole[1]
          ];

        if (
          replacement ===
          undefined
        ) {
          throw new BadRequestException(
            `Unknown status write-back placeholder: ${whole[1]}`,
          );
        }

        return replacement;
      }

      return value.replace(
        /\{([A-Za-z][A-Za-z0-9]*)\}/g,
        (
          _match,
          key: string,
        ) => {
          const replacement =
            values[key];

          if (
            replacement ===
            undefined
          ) {
            throw new BadRequestException(
              `Unknown status write-back placeholder: ${key}`,
            );
          }

          return replacement;
        },
      );
    }

    if (
      Array.isArray(value)
    ) {
      return value.map(
        item =>
          this.renderTemplateValue(
            item,
            writeback,
            statusMap,
          ),
      );
    }

    const object =
      this.objectOrUndefined(
        value,
      );

    if (object) {
      return Object.fromEntries(
        Object.entries(
          object,
        ).map(
          ([key, item]) => [
            key,
            this.renderTemplateValue(
              item,
              writeback,
              statusMap,
            ),
          ],
        ),
      );
    }

    return value;
  }

  private writebackValues(
    writeback:
      SubmissionStatusWriteback,
    statusMap:
      IntegrationObject,
  ): Record<string, string> {
    return {
      status:
        writeback.status,
      mappedStatus:
        this.mappedStatus(
          writeback.status,
          statusMap,
        ),
      submissionId:
        writeback.submissionId,
      providerReference:
        writeback.providerReference ??
        '',
      documentNumber:
        writeback.documentNumber,
      externalInvoiceId:
        writeback.externalInvoiceId,
      externalInvoiceNumber:
        writeback.externalInvoiceNumber ??
        '',
      updatedAt:
        writeback.updatedAt,
    };
  }

  private requireString(
    source: IntegrationObject,
    key: string,
  ) {
    const value =
      this.optionalString(
        source,
        key,
      );

    if (!value) {
      throw new BadRequestException(
        `Missing integration setting: ${key}`,
      );
    }

    return value;
  }

  private optionalString(
    source: IntegrationObject,
    key: string,
  ) {
    const value =
      source[key];

    if (
      typeof value ===
        'string' &&
      value.trim()
    ) {
      return value.trim();
    }

    return undefined;
  }

  private anyString(
    source: IntegrationObject,
    keys: string[],
  ) {
    for (
      const key
      of keys
    ) {
      const value =
        source[key];

      if (
        typeof value ===
          'string' &&
        value.trim()
      ) {
        return value.trim();
      }

      if (
        typeof value ===
          'number' &&
        Number.isFinite(
          value,
        )
      ) {
        return String(
          value,
        );
      }
    }

    return undefined;
  }

  private requireAnyString(
    source: IntegrationObject,
    keys: string[],
    label: string,
  ) {
    const value =
      this.anyString(
        source,
        keys,
      );

    if (!value) {
      throw new BadGatewayException(
        `ERP invoice is missing ${label}`,
      );
    }

    return value;
  }

  private anyNumber(
    source: IntegrationObject,
    keys: string[],
  ) {
    for (
      const key
      of keys
    ) {
      const value =
        source[key];

      if (
        typeof value ===
          'number' &&
        Number.isFinite(
          value,
        )
      ) {
        return value;
      }

      if (
        typeof value ===
          'string' &&
        value.trim()
      ) {
        const parsed =
          Number(
            value,
          );

        if (
          Number.isFinite(
            parsed,
          )
        ) {
          return parsed;
        }
      }
    }

    return undefined;
  }

  private requireAnyNumber(
    source: IntegrationObject,
    keys: string[],
    label: string,
  ) {
    const value =
      this.anyNumber(
        source,
        keys,
      );

    if (
      value ===
      undefined
    ) {
      throw new BadGatewayException(
        `ERP invoice is missing ${label}`,
      );
    }

    return value;
  }
}
