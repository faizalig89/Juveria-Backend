export interface RemoteAspConfig {
  provider: string;
  baseUrl: string;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  bearerToken?: string;
  timeoutMs: number;
  submissionPath: string;
  statusPath: string;
}

const normalizeBaseUrl = (
  value: string,
): string => {
  const trimmed = value.trim();

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(
      'ASP_BASE_URL must be a valid absolute URL.',
    );
  }

  if (
    url.protocol !== 'https:' &&
    url.protocol !== 'http:'
  ) {
    throw new Error(
      'ASP_BASE_URL must use HTTP or HTTPS.',
    );
  }

  return trimmed.replace(/\/+$/, '');
};

const parseTimeout = (
  value: string | undefined,
): number => {
  if (!value?.trim()) {
    return 15000;
  }

  const timeoutMs = Number(value);

  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs <= 0
  ) {
    throw new Error(
      'ASP_HTTP_TIMEOUT_MS must be a positive integer.',
    );
  }

  return timeoutMs;
};

const normalizePath = (
  value: string | undefined,
  fallback: string,
): string => {
  const path =
    value?.trim() || fallback;

  return path.startsWith('/')
    ? path
    : `/${path}`;
};

export const loadRemoteAspConfig = (
  provider: string,
): RemoteAspConfig => {
  const baseUrl =
    process.env.ASP_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error(
      `ASP_BASE_URL is required for remote ASP provider: ${provider}`,
    );
  }

  return Object.freeze({
    provider,
    baseUrl: normalizeBaseUrl(baseUrl),
    apiKey:
      process.env.ASP_API_KEY?.trim() ||
      undefined,
    clientId:
      process.env.ASP_CLIENT_ID?.trim() ||
      undefined,
    clientSecret:
      process.env.ASP_CLIENT_SECRET?.trim() ||
      undefined,
    bearerToken:
      process.env.ASP_BEARER_TOKEN?.trim() ||
      undefined,
    timeoutMs: parseTimeout(
      process.env.ASP_HTTP_TIMEOUT_MS,
    ),
    submissionPath: normalizePath(
      process.env.ASP_SUBMISSION_PATH,
      '/submissions',
    ),
    statusPath: normalizePath(
      process.env.ASP_STATUS_PATH,
      '/submissions/{reference}',
    ),
  });
};

