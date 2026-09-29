import { Module } from '@nestjs/common';
import { UaePintAeSchematronService } from './schematron/uae-pint-ae-schematron.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { ComplianceController } from './compliance.controller.js';
import { ComplianceService } from './compliance.service.js';
import { GenericInvoiceRulePack } from './rules/generic-invoice.rule-pack.js';
import { UaePintAeRulePack } from './rules/uae-pint-ae.rule-pack.js';
import { UaePintAeSemanticValidator } from './rules/uae-pint-ae-semantic.validator.js';
import { UaePintAeConditionalValidator } from './rules/uae-pint-ae-conditional.validator.js';
import { UaePintAeCodeListValidator } from './rules/uae-pint-ae-codelist.validator.js';
import { UaePintAeArithmeticValidator } from './rules/uae-pint-ae-arithmetic.validator.js';
import { UaePintAeTaxBreakdownValidator } from './rules/uae-pint-ae-tax-breakdown.validator.js';
import { UaePintAeUblService } from './ubl/uae-pint-ae-ubl.service.js';
import { UaeEinvoiceReadinessService } from './readiness/uae-einvoice-readiness.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ComplianceController],
  providers: [
    ComplianceService,
    GenericInvoiceRulePack,
    UaePintAeRulePack,
    UaePintAeSemanticValidator,
    UaePintAeConditionalValidator,
    UaePintAeCodeListValidator,
    UaePintAeArithmeticValidator,
    UaePintAeTaxBreakdownValidator,
    UaePintAeUblService,
    UaePintAeSchematronService,
    UaeEinvoiceReadinessService,
  ],
  exports: [
    ComplianceService,
    UaePintAeUblService,
    UaeEinvoiceReadinessService,
  ],
})
export class ComplianceModule {}