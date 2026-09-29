import { Injectable } from '@nestjs/common';
import {
  AspAdapter,
  AspReconciliationRequest,
  AspReconciliationResult,
  AspSubmissionRequest,
  AspSubmissionResult,
} from '../contracts/asp-adapter.interface.js';

@Injectable()
export class MockAspAdapter implements AspAdapter {
  readonly providerName = 'MOCK_ASP';

  async submit(
    request: AspSubmissionRequest,
  ): Promise<AspSubmissionResult> {
    return {
      provider: this.providerName,
      status: 'ACCEPTED',
      providerReference: `MOCK-${request.invoiceId}`,
      submittedAt: new Date().toISOString(),
      message: 'Mock ASP accepted the document.',
    };
  }

  async getSubmissionStatus(
    request: AspReconciliationRequest,
  ): Promise<AspReconciliationResult> {
    const expectedReference =
      `MOCK-${request.invoiceId}`;

    const accepted =
      request.providerReference === expectedReference;

    return {
      provider: this.providerName,
      status: accepted ? 'ACCEPTED' : 'UNKNOWN',
      providerReference:
        request.providerReference,
      checkedAt: new Date().toISOString(),
      message: accepted
        ? 'Mock ASP confirmed the document was accepted.'
        : 'Mock ASP could not confirm an authoritative submission outcome.',
    };
  }
}
