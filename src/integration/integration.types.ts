export const INTEGRATION_PROVIDERS = [
  'MICROSOFT_BUSINESS_CENTRAL',
  'MICROSOFT_D365_FINANCE',
  'SAP_S4HANA',
  'SAP_BUSINESS_ONE',
  'ORACLE_FUSION',
  'NETSUITE',
  'EPICOR_KINETIC',
  'ZOHO_BOOKS',
] as const;

export type IntegrationProvider =
  (typeof INTEGRATION_PROVIDERS)[number];

export const INTEGRATION_AUTH_TYPES = [
  'OAUTH_CLIENT_CREDENTIALS',
  'BASIC',
  'SAP_B1_SESSION',
  'NETSUITE_OAUTH2_M2M',
  'EPICOR_API_KEY',
  'ZOHO_OAUTH_REFRESH',
] as const;

export type IntegrationAuthType =
  (typeof INTEGRATION_AUTH_TYPES)[number];

export type IntegrationObject =
  Record<string, unknown>;

export type ConnectionContext = {
  id: string;
  tenantId: string;
  provider: IntegrationProvider;
  baseUrl: string;
  authType: IntegrationAuthType;
  config: IntegrationObject;
  credentials: IntegrationObject;
};

export type ExternalInvoiceRecord = {
  externalId: string;
  externalInvoiceNumber: string;
  externalStatus?: string;
  externalVersion?: string;
  invoice: IntegrationObject;
  metadata?: IntegrationObject;
};


export const SUBMISSION_WRITEBACK_STATUSES = [
  'ACCEPTED',
  'REJECTED',
  'PENDING',
  'ERROR',
  'UNKNOWN',
] as const;

export type SubmissionWritebackStatus =
  (typeof SUBMISSION_WRITEBACK_STATUSES)[number];

export type SubmissionStatusWriteback = {
  submissionId: string;
  status: SubmissionWritebackStatus;
  providerReference?: string;
  documentNumber: string;
  externalInvoiceId: string;
  externalInvoiceNumber?: string;
  updatedAt: string;
};

export const PROVIDER_LABELS:
  Record<IntegrationProvider, string> = {
    MICROSOFT_BUSINESS_CENTRAL:
      'Microsoft Dynamics 365 Business Central',
    MICROSOFT_D365_FINANCE:
      'Microsoft Dynamics 365 Finance',
    SAP_S4HANA:
      'SAP S/4HANA',
    SAP_BUSINESS_ONE:
      'SAP Business One',
    ORACLE_FUSION:
      'Oracle Fusion Cloud Financials',
    NETSUITE:
      'Oracle NetSuite',
    EPICOR_KINETIC:
      'Epicor Kinetic',
    ZOHO_BOOKS:
      'Zoho Books',
  };
