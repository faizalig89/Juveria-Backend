import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  IntegrationProviderService,
} from './integration.provider.service.js';
import type {
  ConnectionContext,
  IntegrationProvider,
  SubmissionStatusWriteback,
} from './integration.types.js';

const writeback:
  SubmissionStatusWriteback = {
    submissionId:
      'submission-001',
    status:
      'ACCEPTED',
    providerReference:
      'ASP-REF-001',
    documentNumber:
      'INV-001',
    externalInvoiceId:
      'EXT-001',
    externalInvoiceNumber:
      'ERP-INV-001',
    updatedAt:
      '2026-09-28T10:00:00.000Z',
  };

const statusConfig = {
  enabled:
    true,
  pathTemplate:
    'juveria/status/{externalInvoiceId}',
  method:
    'PATCH',
  payload: {
    status:
      '{mappedStatus}',
    submissionId:
      '{submissionId}',
    providerReference:
      '{providerReference}',
    documentNumber:
      '{documentNumber}',
  },
  statusMap: {
    ACCEPTED:
      'CLEARED',
  },
  headers: {
    'If-Match':
      '*',
  },
};

const context = (
  provider:
    IntegrationProvider,
  authType:
    ConnectionContext[
      'authType'
    ],
  config:
    Record<string, unknown> = {},
  credentials:
    Record<string, unknown> = {},
): ConnectionContext => ({
  id:
    'connection-001',
  tenantId:
    'tenant-001',
  provider,
  baseUrl:
    'https://erp.example.test/',
  authType,
  config: {
    ...config,
    statusWriteback:
      statusConfig,
  },
  credentials,
});

const jsonResponse = (
  body: unknown,
) =>
  new Response(
    JSON.stringify(
      body,
    ),
    {
      status:
        200,
      headers: {
        'content-type':
          'application/json',
      },
    },
  );

const noContent =
  () =>
    new Response(
      null,
      {
        status:
          204,
      },
    );

describe(
  'ERP submission status write-back',
  () => {
    let service:
      IntegrationProviderService;
    let fetchMock:
      ReturnType<
        typeof vi.fn
      >;

    beforeEach(
      () => {
        process.env
          .ERP_ALLOW_PRIVATE_NETWORKS =
          'true';

        fetchMock =
          vi.fn();

        vi.stubGlobal(
          'fetch',
          fetchMock,
        );

        service =
          new IntegrationProviderService();
      },
    );

    afterEach(
      () => {
        delete process.env
          .ERP_ALLOW_PRIVATE_NETWORKS;

        vi.unstubAllGlobals();
        vi.restoreAllMocks();
      },
    );

    it(
      'advertises status write-back only for transport-ready providers',
      () => {
        const providers =
          service.providers();

        expect(
          providers,
        ).toHaveLength(
          8,
        );

        const transportReadyProviders = [
          'MICROSOFT_BUSINESS_CENTRAL',
          'MICROSOFT_D365_FINANCE',
          'SAP_S4HANA',
          'SAP_BUSINESS_ONE',
          'ORACLE_FUSION',
        ] as const;

        for (const provider of transportReadyProviders) {
          expect(
            providers.find(
              item => item.provider === provider,
            )?.capabilities.pushSubmissionStatus,
          ).toBe(true);
        }

        const foundationOnlyProviders = [
          'NETSUITE',
          'EPICOR_KINETIC',
          'ZOHO_BOOKS',
        ] as const;

        for (const provider of foundationOnlyProviders) {
          expect(
            providers.find(
              item => item.provider === provider,
            )?.capabilities.pushSubmissionStatus,
          ).toBe(false);
        }
      },
    );

    it(
      'writes status to Microsoft Business Central with OAuth',
      async () => {
        fetchMock
          .mockResolvedValueOnce(
            jsonResponse({
              access_token:
                'token-bc',
            }),
          )
          .mockResolvedValueOnce(
            noContent(),
          );

        const result =
          await service
            .pushSubmissionStatus(
              context(
                'MICROSOFT_BUSINESS_CENTRAL',
                'OAUTH_CLIENT_CREDENTIALS',
                {
                  microsoftTenantId:
                    'tenant-guid',
                },
                {
                  clientId:
                    'client-id',
                  clientSecret:
                    'client-secret',
                },
              ),
              writeback,
            );

        expect(
          result.mappedStatus,
        ).toBe(
          'CLEARED',
        );

        const call =
          fetchMock.mock
            .calls[1];

        expect(
          call,
        ).toBeDefined();

        const target =
          call?.[0] as URL;

        const options =
          call?.[1] as
            RequestInit;

        expect(
          String(target),
        ).toContain(
          'juveria/status/EXT-001',
        );

        expect(
          options.method,
        ).toBe(
          'PATCH',
        );

        expect(
          (
            options.headers as
              Record<
                string,
                string
              >
          ).authorization,
        ).toBe(
          'Bearer token-bc',
        );

        expect(
          JSON.parse(
            String(
              options.body,
            ),
          ),
        ).toMatchObject({
          status:
            'CLEARED',
          submissionId:
            'submission-001',
          providerReference:
            'ASP-REF-001',
        });
      },
    );

    it(
      'writes status to Microsoft D365 Finance with OAuth',
      async () => {
        fetchMock
          .mockResolvedValueOnce(
            jsonResponse({
              access_token:
                'token-d365',
            }),
          )
          .mockResolvedValueOnce(
            noContent(),
          );

        await service
          .pushSubmissionStatus(
            context(
              'MICROSOFT_D365_FINANCE',
              'OAUTH_CLIENT_CREDENTIALS',
              {
                microsoftTenantId:
                  'tenant-guid',
              },
              {
                clientId:
                  'client-id',
                clientSecret:
                  'client-secret',
              },
            ),
            writeback,
          );

        const call =
          fetchMock.mock
            .calls[1];

        expect(
          call,
        ).toBeDefined();

        const options =
          call?.[1] as
            RequestInit;

        expect(
          (
            options.headers as
              Record<
                string,
                string
              >
          ).authorization,
        ).toBe(
          'Bearer token-d365',
        );
      },
    );

    it(
      'writes status to SAP S/4HANA using provider authentication',
      async () => {
        fetchMock
          .mockResolvedValueOnce(
            noContent(),
          );

        await service
          .pushSubmissionStatus(
            context(
              'SAP_S4HANA',
              'BASIC',
              {},
              {
                username:
                  'sap-user',
                password:
                  'sap-password',
              },
            ),
            writeback,
          );

        const call =
          fetchMock.mock
            .calls[0];

        expect(
          call,
        ).toBeDefined();

        const options =
          call?.[1] as
            RequestInit;

        expect(
          (
            options.headers as
              Record<
                string,
                string
              >
          ).authorization,
        ).toMatch(
          /^Basic /,
        );
      },
    );

    it(
      'writes status to SAP Business One within a session',
      async () => {
        fetchMock
          .mockResolvedValueOnce(
            jsonResponse({
              SessionId:
                'session-b1',
            }),
          )
          .mockResolvedValueOnce(
            noContent(),
          )
          .mockResolvedValueOnce(
            noContent(),
          );

        await service
          .pushSubmissionStatus(
            context(
              'SAP_BUSINESS_ONE',
              'SAP_B1_SESSION',
              {},
              {
                companyDb:
                  'COMPANY',
                username:
                  'b1-user',
                password:
                  'b1-password',
              },
            ),
            writeback,
          );

        expect(
          fetchMock,
        ).toHaveBeenCalledTimes(
          3,
        );

        const call =
          fetchMock.mock
            .calls[1];

        expect(
          call,
        ).toBeDefined();

        const options =
          call?.[1] as
            RequestInit;

        expect(
          (
            options.headers as
              Record<
                string,
                string
              >
          ).cookie,
        ).toBe(
          'B1SESSION=session-b1',
        );
      },
    );

    it(
      'writes status to Oracle Fusion using provider authentication',
      async () => {
        fetchMock
          .mockResolvedValueOnce(
            noContent(),
          );

        await service
          .pushSubmissionStatus(
            context(
              'ORACLE_FUSION',
              'BASIC',
              {},
              {
                username:
                  'oracle-user',
                password:
                  'oracle-password',
              },
            ),
            writeback,
          );

        const call =
          fetchMock.mock
            .calls[0];

        expect(
          call,
        ).toBeDefined();

        const options =
          call?.[1] as
            RequestInit;

        const headers =
          options.headers as
            Record<
              string,
              string
            >;

        expect(
          headers.authorization,
        ).toMatch(
          /^Basic /,
        );

        expect(
          headers[
            'REST-Framework-Version'
          ],
        ).toBe(
          '4',
        );
      },
    );
  },
);
