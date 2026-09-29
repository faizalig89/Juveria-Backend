import { Injectable } from '@nestjs/common';
import { ComplianceService } from '../compliance.service.js';
import { UaePintAeUblService } from '../ubl/uae-pint-ae-ubl.service.js';
import { UaePintAeSchematronService } from '../schematron/uae-pint-ae-schematron.service.js';

@Injectable()
export class UaeEinvoiceReadinessService {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly ublService: UaePintAeUblService,
    private readonly schematronService: UaePintAeSchematronService,
  ) {}

  async evaluate(
    invoiceId: string,
    tenantId: string,
    userId?: string,
  ) {
    const internal = await this.complianceService.validateUaeInvoice(
      invoiceId,
      tenantId,
      userId,
    );

    const xml = await this.ublService.generate(
      invoiceId,
      tenantId,
    );

    const official = await this.schematronService.validate(xml);

    const internalPassed =
      internal.summary.failedRules === 0;

    const officialPassed =
      official.passed === true &&
      official.totalFailures === 0;

    const readinessStatus =
      internalPassed && officialPassed
        ? 'READY'
        : 'NOT_READY';

    return {
      invoiceId,
      standard: 'PINT-AE',
      version: '1.4.4',
      readinessStatus,

      internal: {
        rulePack: internal.rulePack,
        complianceStatus: internal.complianceStatus,
        totalRules: internal.summary.totalRules,
        passedRules: internal.summary.passedRules,
        failedRules: internal.summary.failedRules,
        skippedRules: internal.summary.skippedRules,
        passed: internalPassed,
        results: internal.results,
      },

      official: {
        shared: official.shared,
        uae: official.uae,
        totalFailures: official.totalFailures,
        passed: officialPassed,
        failures: official.failures,
      },

      ublGenerated: true,
    };
  }
}
