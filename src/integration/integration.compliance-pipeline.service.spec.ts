import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  IntegrationCompliancePipelineService,
} from './integration.compliance-pipeline.service.js';

const readinessResult = (
  status:
    'READY' |
    'NOT_READY',
) => ({
  invoiceId:
    'invoice-test',
  standard:
    'PINT-AE',
  version:
    '1.4.4',
  readinessStatus:
    status,
  internal: {
    rulePack:
      'UAE-PINT-AE',
    complianceStatus:
      status === 'READY'
        ? 'COMPLIANT'
        : 'NON_COMPLIANT',
    totalRules:
      77,
    passedRules:
      status === 'READY'
        ? 77
        : 76,
    failedRules:
      status === 'READY'
        ? 0
        : 1,
    skippedRules:
      0,
    passed:
      status === 'READY',
    results: [],
  },
  official: {
    shared: {},
    uae: {},
    totalFailures:
      status === 'READY'
        ? 0
        : 1,
    passed:
      status === 'READY',
    failures: [],
  },
  ublGenerated:
    true,
});

describe(
  'IntegrationCompliancePipelineService',
  () => {
    it(
      'does not submit a NOT_READY invoice',
      async () => {
        const readinessService = {
          evaluate:
            vi.fn()
              .mockResolvedValue(
                readinessResult(
                  'NOT_READY',
                ),
              ),
        };

        const aspService = {
          submit:
            vi.fn(),
        };

        const service =
          new IntegrationCompliancePipelineService(
            readinessService as never,
            aspService as never,
          );

        const result =
          await service.process(
            'invoice-test',
            'tenant-test',
            'user-test',
            true,
          );

        expect(
          result.readinessStatus,
        ).toBe(
          'NOT_READY',
        );

        expect(
          result.aspSubmitted,
        ).toBe(false);

        expect(
          aspService.submit,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'keeps READY invoices pending ASP when auto-submit is disabled',
      async () => {
        const readinessService = {
          evaluate:
            vi.fn()
              .mockResolvedValue(
                readinessResult(
                  'READY',
                ),
              ),
        };

        const aspService = {
          submit:
            vi.fn(),
        };

        const service =
          new IntegrationCompliancePipelineService(
            readinessService as never,
            aspService as never,
          );

        const result =
          await service.process(
            'invoice-test',
            'tenant-test',
            'user-test',
            false,
          );

        expect(
          result.readinessStatus,
        ).toBe('READY');

        expect(
          result.aspSubmissionAttempted,
        ).toBe(false);

        expect(
          aspService.submit,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'submits a READY invoice when auto-submit is enabled',
      async () => {
        const readinessService = {
          evaluate:
            vi.fn()
              .mockResolvedValue(
                readinessResult(
                  'READY',
                ),
              ),
        };

        const aspService = {
          submit:
            vi.fn()
              .mockResolvedValue({
                submissionId:
                  'submission-test',
                status:
                  'ACCEPTED',
              }),
        };

        const service =
          new IntegrationCompliancePipelineService(
            readinessService as never,
            aspService as never,
          );

        const result =
          await service.process(
            'invoice-test',
            'tenant-test',
            'user-test',
            true,
          );

        expect(
          result.aspSubmissionAttempted,
        ).toBe(true);

        expect(
          result.aspSubmitted,
        ).toBe(true);

        expect(
          aspService.submit,
        ).toHaveBeenCalledWith(
          'invoice-test',
          'tenant-test',
          'user-test',
        );
      },
    );
  },
);
