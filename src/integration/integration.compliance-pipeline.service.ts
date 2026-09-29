import {
  Inject,
  Injectable,
} from '@nestjs/common';

export const INTEGRATION_READINESS_PORT =
  Symbol(
    'INTEGRATION_READINESS_PORT',
  );

export const INTEGRATION_ASP_PORT =
  Symbol(
    'INTEGRATION_ASP_PORT',
  );

type ReadinessResult = {
  readinessStatus: string;
  internal: {
    passed: boolean;
  };
  official: {
    passed: boolean;
    totalFailures: number;
  };
};

type ReadinessPort = {
  evaluate(
    invoiceId: string,
    tenantId: string,
    userId?: string,
  ): Promise<ReadinessResult>;
};

type AspPort = {
  submit(
    invoiceId: string,
    tenantId: string,
    userId?: string,
  ): Promise<unknown>;
};

export type IntegrationCompliancePipelineResult = {
  readinessStatus:
    'READY' |
    'NOT_READY';
  internalPassed: boolean;
  officialPassed: boolean;
  officialFailures: number;
  autoSubmitReadyInvoices: boolean;
  aspSubmissionAttempted: boolean;
  aspSubmitted: boolean;
};

@Injectable()
export class IntegrationCompliancePipelineService {
  constructor(
    @Inject(
      INTEGRATION_READINESS_PORT,
    )
    private readonly readiness:
      ReadinessPort,
    @Inject(
      INTEGRATION_ASP_PORT,
    )
    private readonly asp:
      AspPort,
  ) {}

  async process(
    invoiceId: string,
    tenantId: string,
    userId: string,
    autoSubmitReadyInvoices: boolean,
  ): Promise<
    IntegrationCompliancePipelineResult
  > {
    const readiness =
      await this.readiness.evaluate(
        invoiceId,
        tenantId,
        userId,
      );

    const base = {
      internalPassed:
        readiness.internal.passed,
      officialPassed:
        readiness.official.passed,
      officialFailures:
        readiness.official.totalFailures,
      autoSubmitReadyInvoices,
    };

    if (
      readiness.readinessStatus !==
      'READY'
    ) {
      return {
        ...base,
        readinessStatus:
          'NOT_READY',
        aspSubmissionAttempted:
          false,
        aspSubmitted:
          false,
      };
    }

    if (
      !autoSubmitReadyInvoices
    ) {
      return {
        ...base,
        readinessStatus:
          'READY',
        aspSubmissionAttempted:
          false,
        aspSubmitted:
          false,
      };
    }

    await this.asp.submit(
      invoiceId,
      tenantId,
      userId,
    );

    return {
      ...base,
      readinessStatus:
        'READY',
      aspSubmissionAttempted:
        true,
      aspSubmitted:
        true,
    };
  }
}
