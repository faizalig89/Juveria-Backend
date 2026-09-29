import {
  Injectable,
} from '@nestjs/common';
import {
  env,
} from '../../config/env.js';
import {
  AspHttpService,
} from '../transport/asp-http.service.js';
import {
  loadRemoteAspConfig,
} from '../config/remote-asp.config.js';
import type {
  AspAdapter,
  AspReconciliationRequest,
  AspReconciliationResult,
  AspSubmissionRequest,
  AspSubmissionResult,
  AspSubmissionStatus,
} from '../contracts/asp-adapter.interface.js';

interface RemoteAspResponse {
  status?: string;
  providerReference?: string;
  reference?: string;
  id?: string;
  message?: string;
}

@Injectable()
export class RemoteAspAdapter
  implements AspAdapter
{
  readonly providerName =
    env.aspProvider;

  constructor(
    private readonly http:
      AspHttpService,
  ) {}

  private normalizeStatus(
    value: unknown,
  ): AspSubmissionStatus {
    if (
      typeof value !== 'string'
    ) {
      return 'UNKNOWN';
    }

    const status =
      value.trim().toUpperCase();

    switch (status) {
      case 'ACCEPTED':
      case 'APPROVED':
      case 'SUCCESS':
      case 'COMPLETED':
        return 'ACCEPTED';

      case 'REJECTED':
      case 'DECLINED':
      case 'FAILED':
        return 'REJECTED';

      case 'PENDING':
      case 'PROCESSING':
      case 'SUBMITTED':
      case 'QUEUED':
        return 'PENDING';

      case 'ERROR':
        return 'ERROR';

      default:
        return 'UNKNOWN';
    }
  }

  private parseBody(
    body: string,
  ): RemoteAspResponse {
    if (!body.trim()) {
      return {};
    }

    try {
      const parsed =
        JSON.parse(body);

      if (
        parsed &&
        typeof parsed === 'object'
      ) {
        return parsed as RemoteAspResponse;
      }

      return {};
    } catch {
      return {
        message: body,
      };
    }
  }

  private buildHeaders(
    apiKey?: string,
    clientId?: string,
    clientSecret?: string,
    bearerToken?: string,
  ): Record<string, string> {
    const headers:
      Record<string, string> = {
        'content-type':
          'application/json',
        accept:
          'application/json',
      };

    if (apiKey) {
      headers['x-api-key'] =
        apiKey;
    }

    if (clientId) {
      headers['x-client-id'] =
        clientId;
    }

    if (clientSecret) {
      headers['x-client-secret'] =
        clientSecret;
    }

    if (bearerToken) {
      headers.authorization =
        `Bearer ${bearerToken}`;
    }

    return headers;
  }

  async submit(
    request: AspSubmissionRequest,
  ): Promise<AspSubmissionResult> {
    const config =
      loadRemoteAspConfig(
        this.providerName,
      );

    const response =
      await this.http.request(
        `${config.baseUrl}${config.submissionPath}`,
        {
          method: 'POST',
          headers:
            this.buildHeaders(
              config.apiKey,
              config.clientId,
              config.clientSecret,
              config.bearerToken,
            ),
          body: JSON.stringify({
            invoiceId:
              request.invoiceId,
            tenantId:
              request.tenantId,
            documentType:
              request.documentType,
            documentNumber:
              request.documentNumber,
            ublXml:
              request.ublXml,
            idempotencyKey:
              request.idempotencyKey,
          }),
          timeoutMs:
            config.timeoutMs,
        },
      );

    const body =
      this.parseBody(
        response.body,
      );

    const status =
      response.ok
        ? this.normalizeStatus(
            body.status,
          )
        : 'ERROR';

    return {
      provider:
        this.providerName,
      status,
      providerReference:
        body.providerReference ??
        body.reference ??
        body.id,
      submittedAt:
        new Date().toISOString(),
      message:
        body.message ??
        (response.ok
          ? undefined
          : `Remote ASP returned HTTP ${response.status}.`),
    };
  }

  async getSubmissionStatus(
    request: AspReconciliationRequest,
  ): Promise<AspReconciliationResult> {
    const config =
      loadRemoteAspConfig(
        this.providerName,
      );

    const reference =
      request.providerReference ??
      request.idempotencyKey;

    const statusPath =
      config.statusPath.replace(
        '{reference}',
        encodeURIComponent(reference),
      );

    const response =
      await this.http.request(
        `${config.baseUrl}${statusPath}`,
        {
          method: 'GET',
          headers:
            this.buildHeaders(
              config.apiKey,
              config.clientId,
              config.clientSecret,
              config.bearerToken,
            ),
          timeoutMs:
            config.timeoutMs,
        },
      );

    const body =
      this.parseBody(
        response.body,
      );

    const status =
      response.ok
        ? this.normalizeStatus(
            body.status,
          )
        : 'UNKNOWN';

    return {
      provider:
        this.providerName,
      status,
      providerReference:
        body.providerReference ??
        body.reference ??
        body.id ??
        request.providerReference,
      checkedAt:
        new Date().toISOString(),
      message:
        body.message ??
        (response.ok
          ? undefined
          : `Remote ASP reconciliation returned HTTP ${response.status}.`),
    };
  }
}

