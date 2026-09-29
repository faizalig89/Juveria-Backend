export type AspSubmissionStatus =
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PENDING'
  | 'ERROR'
  | 'UNKNOWN';

export interface AspSubmissionRequest {
  invoiceId: string;
  tenantId: string;
  documentType: 'INVOICE' | 'CREDIT_NOTE';
  documentNumber: string;
  ublXml: string;
  idempotencyKey: string;
}

export interface AspSubmissionResult {
  provider: string;
  status: AspSubmissionStatus;
  providerReference?: string;
  submittedAt: string;
  message?: string;
}

export interface AspReconciliationRequest {
  invoiceId: string;
  tenantId: string;
  documentNumber: string;
  idempotencyKey: string;
  providerReference?: string;
}

export interface AspReconciliationResult {
  provider: string;
  status: AspSubmissionStatus;
  providerReference?: string;
  checkedAt: string;
  message?: string;
}

export interface AspAdapter {
  readonly providerName: string;

  submit(
    request: AspSubmissionRequest,
  ): Promise<AspSubmissionResult>;

  getSubmissionStatus(
    request: AspReconciliationRequest,
  ): Promise<AspReconciliationResult>;
}
