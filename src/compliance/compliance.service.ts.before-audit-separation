import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { GenericInvoiceRulePack } from './rules/generic-invoice.rule-pack.js';
import { InvoiceRulePack } from './rules/rule.types.js';
import { UaePintAeRulePack } from './rules/uae-pint-ae.rule-pack.js';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly genericRulePack: GenericInvoiceRulePack,
    private readonly uaeRulePack: UaePintAeRulePack,
  ) {}

  async validateInvoice(
    invoiceId: string,
    tenantId: string,
    userId?: string,
  ) {
    return this.validateWithRulePack(
      invoiceId,
      tenantId,
      this.genericRulePack,
      userId,
    );
  }

  async validateUaeInvoice(
    invoiceId: string,
    tenantId: string,
    userId?: string,
  ) {
    return this.validateWithRulePack(
      invoiceId,
      tenantId,
      this.uaeRulePack,
      userId,
    );
  }

  private async validateWithRulePack(
    invoiceId: string,
    tenantId: string,
    rulePack: InvoiceRulePack,
    userId?: string,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        lines: true,
        documents: true,
        parties: true,
        taxBreakdowns: true,
        allowanceCharges: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const startingLifecycleStatus = invoice.status;

    await this.prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'VALIDATING',
        },
      });

      await tx.invoiceAuditEvent.create({
        data: {
          invoiceId,
          tenantId,
          userId,
          action: 'VALIDATION_STARTED',
          fromStatus: startingLifecycleStatus,
          toStatus: 'VALIDATING',
          details: {
            complianceStatus: invoice.complianceStatus,
            rulePack: rulePack.code,
          },
        },
      });
    });

    const results = rulePack.evaluate(invoice);

    const failedRules = results.filter(
      (result) => result.status === 'FAIL',
    );

    const passedRules = results.filter(
      (result) => result.status === 'PASS',
    );

    const skippedRules = results.filter(
      (result) => result.status === 'SKIPPED',
    );

    const overallStatus =
      failedRules.length === 0 && results.length > 0
        ? 'COMPLIANT'
        : results.length === 0
          ? 'PENDING'
          : 'NON_COMPLIANT';

    await this.prisma.$transaction(async (tx) => {
      /*
       * Current persistence table does not yet contain a rulePack
       * column. Until pack-aware persistence is added, each validation
       * replaces the stored result set with the active pack's results.
       */
      await tx.invoiceComplianceResult.deleteMany({
        where: {
          invoiceId,
          tenantId,
          rulePack: rulePack.code,
        },
      });

      if (results.length > 0) {
        await tx.invoiceComplianceResult.createMany({
          data: results.map((result) => ({
            invoiceId,
            tenantId,
            rulePack: rulePack.code,
            ruleCode: result.ruleCode,
            ruleName: result.ruleName,
            status: result.status,
            severity: result.severity,
            message: result.message,
            field: result.field,
            actualValue: result.actualValue,
          })),
        });
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'VALIDATED',
          complianceStatus: overallStatus,
        },
      });

      await tx.invoiceAuditEvent.create({
        data: {
          invoiceId,
          tenantId,
          userId,
          action: 'COMPLIANCE_VALIDATION_COMPLETED',
          fromStatus: 'VALIDATING',
          toStatus: 'VALIDATED',
          details: {
            rulePack: rulePack.code,
            complianceStatus: overallStatus,
            previousComplianceStatus:
              invoice.complianceStatus,
            totalRules: results.length,
            passedRules: passedRules.length,
            failedRules: failedRules.length,
            skippedRules: skippedRules.length,
          },
        },
      });
    });

    return {
      invoiceId,
      rulePack: rulePack.code,
      complianceStatus: overallStatus,
      summary: {
        totalRules: results.length,
        passedRules: passedRules.length,
        failedRules: failedRules.length,
        skippedRules: skippedRules.length,
      },
      results,
    };
  }

  async getResults(
    invoiceId: string,
    tenantId: string,
    rulePackCode?: string,
  ) {
    const invoice =
      await this.prisma.invoice.findFirst({
        where: { id: invoiceId, tenantId },
      });

    if (!invoice) {
      throw new NotFoundException(
        'Invoice not found',
      );
    }

    const results =
      await this.prisma.invoiceComplianceResult.findMany({
        where: {
          invoiceId,
          tenantId,
          ...(rulePackCode
            ? { rulePack: rulePackCode }
            : {}),
        },
        orderBy: { createdAt: 'asc' },
      });

    return {
      invoiceId,
      rulePack: rulePackCode ?? 'ALL',
      complianceStatus:
        invoice.complianceStatus,
      results,
    };
  }

  async getGenericResults(
    invoiceId: string,
    tenantId: string,
  ) {
    return this.getResults(
      invoiceId,
      tenantId,
      this.genericRulePack.code,
    );
  }

  async getUaeResults(
    invoiceId: string,
    tenantId: string,
  ) {
    return this.getResults(
      invoiceId,
      tenantId,
      this.uaeRulePack.code,
    );
  }
}