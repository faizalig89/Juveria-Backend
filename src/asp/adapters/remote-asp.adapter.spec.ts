import { AspHttpService } from '../transport/asp-http.service.js';
import { RemoteAspAdapter } from './remote-asp.adapter.js';

describe('RemoteAspAdapter', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  const configureRemoteAsp = () => {
    process.env.ASP_BASE_URL =
      'https://asp.example.test';
    process.env.ASP_HTTP_TIMEOUT_MS =
      '5000';
    process.env.ASP_API_KEY =
      'test-api-key';
    process.env.ASP_CLIENT_ID =
      'test-client';
    process.env.ASP_CLIENT_SECRET =
      'test-secret';
  };

  it('submits an invoice through a provider-neutral remote ASP', async () => {
    configureRemoteAsp();

    const http = {
      request: vi.fn().mockResolvedValue({
        status: 202,
        ok: true,
        headers: {},
        body: JSON.stringify({
          status: 'SUBMITTED',
          providerReference:
            'REMOTE-REF-001',
          message:
            'Submission received.',
        }),
      }),
    } as unknown as AspHttpService;

    const adapter =
      new RemoteAspAdapter(http);

    const result =
      await adapter.submit({
        invoiceId: 'invoice-001',
        tenantId: 'tenant-001',
        documentType: 'INVOICE',
        documentNumber: 'JUV-001',
        ublXml:
          '<Invoice>Juveria</Invoice>',
        idempotencyKey:
          'idem-001',
      });

    expect(result.status).toBe(
      'PENDING',
    );

    expect(
      result.providerReference,
    ).toBe('REMOTE-REF-001');

    expect(http.request).toHaveBeenCalledTimes(
      1,
    );

    expect(http.request).toHaveBeenCalledWith(
      'https://asp.example.test/submissions',
      expect.objectContaining({
        method: 'POST',
        timeoutMs: 5000,
        headers: expect.objectContaining({
          'x-api-key':
            'test-api-key',
          'x-client-id':
            'test-client',
          'x-client-secret':
            'test-secret',
        }),
      }),
    );

    const call =
      (
        http.request as unknown as ReturnType<typeof vi.fn>
      ).mock.calls[0];

    const body =
      JSON.parse(call[1].body);

    expect(body).toEqual({
      invoiceId: 'invoice-001',
      tenantId: 'tenant-001',
      documentType: 'INVOICE',
      documentNumber: 'JUV-001',
      ublXml:
        '<Invoice>Juveria</Invoice>',
      idempotencyKey:
        'idem-001',
    });
  });

  it('normalizes APPROVED reconciliation to ACCEPTED', async () => {
    configureRemoteAsp();

    const http = {
      request: vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: {},
        body: JSON.stringify({
          status: 'APPROVED',
          providerReference:
            'REMOTE-REF-001',
          message:
            'Invoice approved.',
        }),
      }),
    } as unknown as AspHttpService;

    const adapter =
      new RemoteAspAdapter(http);

    const result =
      await adapter.getSubmissionStatus({
        invoiceId: 'invoice-001',
        tenantId: 'tenant-001',
        documentNumber: 'JUV-001',
        idempotencyKey:
          'idem-001',
        providerReference:
          'REMOTE-REF-001',
      });

    expect(result.status).toBe(
      'ACCEPTED',
    );

    expect(
      result.providerReference,
    ).toBe('REMOTE-REF-001');

    expect(http.request).toHaveBeenCalledWith(
      'https://asp.example.test/submissions/REMOTE-REF-001',
      expect.objectContaining({
        method: 'GET',
        timeoutMs: 5000,
      }),
    );
  });

  it('uses idempotency key when provider reference is absent', async () => {
    configureRemoteAsp();

    const http = {
      request: vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: {},
        body: JSON.stringify({
          status: 'PROCESSING',
        }),
      }),
    } as unknown as AspHttpService;

    const adapter =
      new RemoteAspAdapter(http);

    const result =
      await adapter.getSubmissionStatus({
        invoiceId: 'invoice-001',
        tenantId: 'tenant-001',
        documentNumber: 'JUV-001',
        idempotencyKey:
          'fallback-key-001',
      });

    expect(result.status).toBe(
      'PENDING',
    );

    expect(http.request).toHaveBeenCalledWith(
      'https://asp.example.test/submissions/fallback-key-001',
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('maps unsuccessful submission HTTP responses to ERROR', async () => {
    configureRemoteAsp();

    const http = {
      request: vi.fn().mockResolvedValue({
        status: 503,
        ok: false,
        headers: {},
        body: '',
      }),
    } as unknown as AspHttpService;

    const adapter =
      new RemoteAspAdapter(http);

    const result =
      await adapter.submit({
        invoiceId: 'invoice-001',
        tenantId: 'tenant-001',
        documentType: 'INVOICE',
        documentNumber: 'JUV-001',
        ublXml:
          '<Invoice>Juveria</Invoice>',
        idempotencyKey:
          'idem-001',
      });

    expect(result.status).toBe(
      'ERROR',
    );

    expect(result.message).toBe(
      'Remote ASP returned HTTP 503.',
    );
  });

  it('maps unsuccessful reconciliation HTTP responses to UNKNOWN', async () => {
    configureRemoteAsp();

    const http = {
      request: vi.fn().mockResolvedValue({
        status: 503,
        ok: false,
        headers: {},
        body: '',
      }),
    } as unknown as AspHttpService;

    const adapter =
      new RemoteAspAdapter(http);

    const result =
      await adapter.getSubmissionStatus({
        invoiceId: 'invoice-001',
        tenantId: 'tenant-001',
        documentNumber: 'JUV-001',
        idempotencyKey:
          'idem-001',
        providerReference:
          'REMOTE-REF-001',
      });

    expect(result.status).toBe(
      'UNKNOWN',
    );

    expect(result.message).toBe(
      'Remote ASP reconciliation returned HTTP 503.',
    );
  });

  it('uses configured submission endpoint path', async () => {
    process.env.ASP_BASE_URL =
      'https://asp.example.com';
    process.env.ASP_SUBMISSION_PATH =
      'api/v1/invoices';

    const http = {
      request: vi.fn().mockResolvedValue({
        status: 202,
        ok: true,
        headers: {},
        body: JSON.stringify({
          status: 'SUBMITTED',
          providerReference:
            'CUSTOM-REF-001',
        }),
      }),
    };

    const adapter =
      new RemoteAspAdapter(
        http as unknown as AspHttpService,
      );

    await adapter.submit({
      invoiceId: 'invoice-custom-1',
      tenantId: 'tenant-custom-1',
      documentType: 'INVOICE',
      documentNumber: 'CUSTOM-001',
      ublXml: '<Invoice />',
      idempotencyKey:
        'custom-idempotency-1',
    });

    expect(http.request).toHaveBeenCalledTimes(1);

    expect(
      http.request.mock.calls[0][0],
    ).toBe(
      'https://asp.example.com/api/v1/invoices',
    );
  });

  it('uses configured reconciliation endpoint and encodes reference', async () => {
    process.env.ASP_BASE_URL =
      'https://asp.example.com';
    process.env.ASP_STATUS_PATH =
      'api/v1/invoices/{reference}';

    const http = {
      request: vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: {},
        body: JSON.stringify({
          status: 'APPROVED',
          providerReference:
            'ASP REF/001',
        }),
      }),
    };

    const adapter =
      new RemoteAspAdapter(
        http as unknown as AspHttpService,
      );

    await adapter.getSubmissionStatus({
      invoiceId: 'invoice-custom-1',
      tenantId: 'tenant-custom-1',
      documentNumber: 'CUSTOM-001',
      idempotencyKey:
        'custom-idempotency-1',
      providerReference:
        'ASP REF/001',
    });

    expect(http.request).toHaveBeenCalledTimes(1);

    expect(
      http.request.mock.calls[0][0],
    ).toBe(
      'https://asp.example.com/api/v1/invoices/ASP%20REF%2F001',
    );
  });

  it('sends Bearer token on remote ASP submission', async () => {
    configureRemoteAsp();

    process.env.ASP_BEARER_TOKEN =
      'submission-bearer-token';

    const http = {
      request: vi.fn().mockResolvedValue({
        status: 202,
        ok: true,
        headers: {},
        body: JSON.stringify({
          status: 'SUBMITTED',
          providerReference:
            'BEARER-SUBMISSION-001',
        }),
      }),
    };

    const adapter =
      new RemoteAspAdapter(
        http as any,
      );

    await adapter.submit({
      invoiceId: 'invoice-bearer-001',
      tenantId: 'tenant-bearer-001',
      documentType: 'INVOICE',
      documentNumber: 'INV-BEARER-001',
      ublXml: '<Invoice />',
      idempotencyKey:
        'idem-bearer-001',
    });

    expect(http.request).toHaveBeenCalledTimes(1);

    expect(http.request).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization:
            'Bearer submission-bearer-token',
        }),
      }),
    );
  });

  it('sends Bearer token on remote ASP reconciliation', async () => {
    configureRemoteAsp();

    process.env.ASP_BEARER_TOKEN =
      'reconciliation-bearer-token';

    const http = {
      request: vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: {},
        body: JSON.stringify({
          status: 'APPROVED',
          providerReference:
            'BEARER-REF-001',
        }),
      }),
    };

    const adapter =
      new RemoteAspAdapter(
        http as any,
      );

    await adapter.getSubmissionStatus({
      invoiceId:
        'invoice-bearer-001',
      tenantId:
        'tenant-bearer-001',
      documentNumber:
        'INV-BEARER-001',
      providerReference:
        'BEARER-REF-001',
      idempotencyKey:
        'idem-bearer-reconcile-001',
    });

    expect(http.request).toHaveBeenCalledTimes(1);

    expect(http.request).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          authorization:
            'Bearer reconciliation-bearer-token',
        }),
      }),
    );
  });
});

