import {
  Injectable,
} from '@nestjs/common';

export interface AspHttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface AspHttpResponse {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  body: string;
}

export class AspHttpTransportError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'ASP_HTTP_TIMEOUT'
      | 'ASP_HTTP_NETWORK_ERROR',
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AspHttpTransportError';
  }
}

@Injectable()
export class AspHttpService {
  async request(
    url: string,
    options: AspHttpRequestOptions = {},
  ): Promise<AspHttpResponse> {
    const timeoutMs =
      options.timeoutMs ?? 15000;

    if (
      !Number.isInteger(timeoutMs) ||
      timeoutMs <= 0
    ) {
      throw new Error(
        'ASP HTTP timeout must be a positive integer.',
      );
    }

    const controller =
      new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      timeoutMs,
    );

    try {
      const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers: options.headers,
        body: options.body,
        signal: controller.signal,
      });

      const body = await response.text();

      const headers: Record<string, string> = {};

      response.headers.forEach(
        (value, key) => {
          headers[key] = value;
        },
      );

      return {
        status: response.status,
        ok: response.ok,
        headers,
        body,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'AbortError'
      ) {
        throw new AspHttpTransportError(
          `ASP HTTP request timed out after ${timeoutMs}ms.`,
          'ASP_HTTP_TIMEOUT',
          error,
        );
      }

      throw new AspHttpTransportError(
        'ASP HTTP request failed before a valid HTTP response was received.',
        'ASP_HTTP_NETWORK_ERROR',
        error,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
