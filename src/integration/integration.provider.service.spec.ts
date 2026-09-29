import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  JsonInvoiceMapperService,
} from '../invoice-ingestion/json-invoice-mapper.service.js';
import {
  IntegrationProviderService,
} from './integration.provider.service.js';
import type {
  ConnectionContext,
  ExternalInvoiceRecord,
  IntegrationObject,
} from './integration.types.js';

type MapperHarness = {
  mapBusinessCentral(
    context: ConnectionContext,
    raw: IntegrationObject,
  ): ExternalInvoiceRecord;

  mapD365Finance(
    context: ConnectionContext,
    raw: IntegrationObject,
  ): ExternalInvoiceRecord;

  mapSapS4(
    context: ConnectionContext,
    raw: IntegrationObject,
  ): ExternalInvoiceRecord;

  mapSapBusinessOne(
    context: ConnectionContext,
    raw: IntegrationObject,
  ): ExternalInvoiceRecord;

  mapOracleFusion(
    context: ConnectionContext,
    raw: IntegrationObject,
  ): ExternalInvoiceRecord;
};

const service =
  new IntegrationProviderService();

const harness =
  service as unknown as
    MapperHarness;

const canonical =
  new JsonInvoiceMapperService();

const base = (
  provider:
    ConnectionContext['provider'],
): ConnectionContext => ({
  id:
    'connection-test',
  tenantId:
    'tenant-test',
  provider,
  baseUrl:
    'https://example.invalid/',
  authType:
    'OAUTH_CLIENT_CREDENTIALS',
  config: {
    jurisdiction:
      'AE',
    transactionTypeCode:
      '00000000',
    seller: {
      name:
        'Juveria Seller LLC',
      countryCode:
        'AE',
    },
  },
  credentials: {},
});

const validate = (
  record:
    ExternalInvoiceRecord,
) =>
  canonical.map(
    record.invoice,
  ).invoice;

describe(
  'ERP provider canonical invoice mapping',
  () => {
    it(
      'maps Microsoft Business Central',
      () => {
        const record =
          harness.mapBusinessCentral(
            base(
              'MICROSOFT_BUSINESS_CENTRAL',
            ),
            {
              id:
                'bc-id-1',
              number:
                'BC-1001',
              invoiceDate:
                '2026-09-28',
              dueDate:
                '2026-10-28',
              currencyCode:
                'AED',
              totalAmountExcludingTax:
                100,
              totalTaxAmount:
                5,
              totalAmountIncludingTax:
                105,
              billToName:
                'Buyer BC',
              billToCountry:
                'AE',
              salesInvoiceLines: [
                {
                  id:
                    'line-1',
                  description:
                    'Consulting',
                  quantity:
                    1,
                  unitPrice:
                    100,
                  amountExcludingTax:
                    100,
                  totalTaxAmount:
                    5,
                  amountIncludingTax:
                    105,
                  taxPercent:
                    5,
                  unitOfMeasureCode:
                    'EA',
                },
              ],
            },
          );

        const invoice =
          validate(record);

        expect(
          invoice.invoiceNumber,
        ).toBe('BC-1001');

        expect(
          invoice.lines,
        ).toHaveLength(1);

        expect(
          invoice.taxBreakdowns,
        ).toHaveLength(1);
      },
    );

    it(
      'maps Microsoft Dynamics 365 Finance',
      () => {
        const record =
          harness.mapD365Finance(
            base(
              'MICROSOFT_D365_FINANCE',
            ),
            {
              RecId:
                'd365-id-1',
              InvoiceNumber:
                'D365-1001',
              InvoiceDate:
                '2026-09-28T00:00:00Z',
              CurrencyCode:
                'AED',
              TotalInvoiceAmount:
                105,
              TotalTaxAmount:
                5,
              InvoiceCustomerName:
                'Buyer D365',
              InvoiceAddressCountryRegionISOCode:
                'AE',
              SalesInvoiceLines: [
                {
                  LineNumber:
                    '1',
                  LineDescription:
                    'Support',
                  SalesQuantity:
                    1,
                  SalesPrice:
                    100,
                  LineAmount:
                    100,
                  SalesTaxAmount:
                    5,
                  SalesTaxRate:
                    5,
                },
              ],
            },
          );

        expect(
          validate(record)
            .invoiceNumber,
        ).toBe(
          'D365-1001',
        );
      },
    );

    it(
      'maps SAP S/4HANA',
      () => {
        const record =
          harness.mapSapS4(
            base(
              'SAP_S4HANA',
            ),
            {
              BillingDocument:
                '900001',
              BillingDocumentDate:
                '2026-09-28',
              TransactionCurrency:
                'AED',
              TotalNetAmount:
                100,
              TaxAmount:
                5,
              TotalGrossAmount:
                105,
              SoldToParty:
                'SAP Buyer',
              to_Item: {
                results: [
                  {
                    BillingDocumentItem:
                      '10',
                    BillingDocumentItemText:
                      'Implementation',
                    BillingQuantity:
                      1,
                    NetPriceAmount:
                      100,
                    NetAmount:
                      100,
                    TaxAmount:
                      5,
                    TaxRate:
                      5,
                  },
                ],
              },
            },
          );

        expect(
          validate(record)
            .invoiceNumber,
        ).toBe('900001');
      },
    );

    it(
      'maps SAP Business One',
      () => {
        const record =
          harness.mapSapBusinessOne(
            {
              ...base(
                'SAP_BUSINESS_ONE',
              ),
              authType:
                'SAP_B1_SESSION',
            },
            {
              DocEntry:
                77,
              DocNum:
                2001,
              DocDate:
                '2026-09-28',
              DocDueDate:
                '2026-10-28',
              DocCurrency:
                'AED',
              DocTotal:
                105,
              VatSum:
                5,
              CardName:
                'B1 Buyer',
              DocumentLines: [
                {
                  LineNum:
                    0,
                  ItemDescription:
                    'Managed Service',
                  Quantity:
                    1,
                  UnitPrice:
                    100,
                  LineTotal:
                    100,
                  GrossTotal:
                    105,
                  TaxTotal:
                    5,
                  TaxPercentagePerRow:
                    5,
                },
              ],
            },
          );

        expect(
          validate(record)
            .invoiceNumber,
        ).toBe('2001');
      },
    );

    it(
      'maps Oracle Fusion Financials',
      () => {
        const record =
          harness.mapOracleFusion(
            base(
              'ORACLE_FUSION',
            ),
            {
              CustomerTransactionId:
                3001,
              TransactionNumber:
                'ORA-1001',
              TransactionDate:
                '2026-09-28',
              InvoiceCurrencyCode:
                'AED',
              EnteredAmount:
                105,
              TaxAmount:
                5,
              InvoiceBalanceAmount:
                105,
              BillToCustomerName:
                'Oracle Buyer',
              receivablesInvoiceLines: [
                {
                  LineNumber:
                    1,
                  Description:
                    'Oracle Service',
                  Quantity:
                    1,
                  UnitSellingPrice:
                    100,
                  LineAmount:
                    100,
                  TaxAmount:
                    5,
                  TaxRate:
                    5,
                },
              ],
            },
          );

        expect(
          validate(record)
            .invoiceNumber,
        ).toBe(
          'ORA-1001',
        );
      },
    );
  },
);
