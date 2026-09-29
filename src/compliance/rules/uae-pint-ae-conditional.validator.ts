import { Injectable } from '@nestjs/common';
import {
  InvoiceRuleContext,
  RuleResult,
} from './rule.types.js';

@Injectable()
export class UaePintAeConditionalValidator {
  evaluate(invoice: InvoiceRuleContext): RuleResult[] {
    const results: RuleResult[] = [];

    const toNumber = (value: unknown): number | null => {
      if (value === null || value === undefined) {
        return null;
      }

      const parsed = Number(String(value));

      return Number.isFinite(parsed)
        ? parsed
        : null;
    };

    /*
     * UAE-CON-001
     *
     * PINT-AE ibr-190-ae:
     * Standard-rated VAT category S must use the UAE
     * standard VAT rate of exactly 5%.
     *
     * We validate every available VAT breakdown independently.
     */
    invoice.taxBreakdowns?.forEach(
      (taxBreakdown, index) => {
        const category =
          taxBreakdown.categoryCode
            ?.trim()
            .toUpperCase() ?? '';

        if (category !== 'S') {
          return;
        }

        const rate =
          toNumber(taxBreakdown.taxRate);

        const valid = rate === 5;

        results.push({
          ruleCode: 'UAE-CON-001',
          ruleName:
            `Standard VAT rate - Tax Breakdown ${index + 1}`,
          status: valid ? 'PASS' : 'FAIL',
          severity: 'ERROR',
          message: valid
            ? 'Standard-rated VAT category S uses the mandatory 5% VAT rate'
            : 'Standard-rated VAT category S must use the mandatory 5% VAT rate',
          field:
            `taxBreakdowns[${index}].taxRate`,
          actualValue:
            rate === null
              ? ''
              : String(rate),
        });
      },
    );

    /*
     * UAE-CON-002
     *
     * Apply the same Standard-rated VAT requirement
     * to each invoice line classified as S.
     */
    invoice.lines?.forEach(
      (line, index) => {
        const category =
          line.taxCategoryCode
            ?.trim()
            .toUpperCase() ?? '';

        if (category !== 'S') {
          return;
        }

        const rate =
          toNumber(line.taxRate);

        const valid = rate === 5;

        results.push({
          ruleCode: 'UAE-CON-002',
          ruleName:
            `Standard VAT rate - Line ${index + 1}`,
          status: valid ? 'PASS' : 'FAIL',
          severity: 'ERROR',
          message: valid
            ? 'Standard-rated invoice line uses the mandatory 5% VAT rate'
            : 'Standard-rated invoice line must use the mandatory 5% VAT rate',
          field:
            `lines[${index}].taxRate`,
          actualValue:
            rate === null
              ? ''
              : String(rate),
        });
      },
    );


    /*
     * UAE-CON-003
     *
     * PINT VAT Zero-rated rule:
     * An invoice line classified as Z must use
     * a VAT rate of exactly zero.
     */
    invoice.lines?.forEach(
      (line, index) => {
        const category =
          line.taxCategoryCode
            ?.trim()
            .toUpperCase() ?? '';

        if (category !== 'Z') {
          return;
        }

        const rate =
          toNumber(line.taxRate);

        const valid = rate === 0;

        results.push({
          ruleCode: 'UAE-CON-003',
          ruleName:
            `Zero-rated VAT rate - Line ${index + 1}`,
          status: valid ? 'PASS' : 'FAIL',
          severity: 'ERROR',
          message: valid
            ? 'Zero-rated invoice line uses VAT rate 0%'
            : 'Zero-rated invoice line must use VAT rate 0%',
          field:
            `lines[${index}].taxRate`,
          actualValue:
            rate === null
              ? ''
              : String(rate),
        });
      },
    );

    /*
     * UAE-CON-004
     *
     * A Zero-rated VAT breakdown must have
     * a VAT tax amount of exactly zero.
     */
    invoice.taxBreakdowns?.forEach(
      (taxBreakdown, index) => {
        const category =
          taxBreakdown.categoryCode
            ?.trim()
            .toUpperCase() ?? '';

        if (category !== 'Z') {
          return;
        }

        const taxAmount =
          toNumber(taxBreakdown.taxAmount);

        const valid = taxAmount === 0;

        results.push({
          ruleCode: 'UAE-CON-004',
          ruleName:
            `Zero-rated VAT amount - Tax Breakdown ${index + 1}`,
          status: valid ? 'PASS' : 'FAIL',
          severity: 'ERROR',
          message: valid
            ? 'Zero-rated VAT breakdown has VAT amount 0'
            : 'Zero-rated VAT breakdown must have VAT amount 0',
          field:
            `taxBreakdowns[${index}].taxAmount`,
          actualValue:
            taxAmount === null
              ? ''
              : String(taxAmount),
        });
      },
    );

    /*
     * UAE-CON-005
     * Reverse-charge invoice line must provide a VAT rate.
     */
    invoice.lines?.forEach(
      (line, index) => {
        const category =
          line.taxCategoryCode
            ?.trim()
            .toUpperCase() ?? '';

        if (category !== 'AE') {
          return;
        }

        const rate = toNumber(line.taxRate);
        const valid = rate !== null;

        results.push({
          ruleCode: 'UAE-CON-005',
          ruleName:
            `Reverse-charge VAT rate present - Line ${index + 1}`,
          status: valid ? 'PASS' : 'FAIL',
          severity: 'ERROR',
          message: valid
            ? 'Reverse-charge invoice line provides a VAT rate'
            : 'Reverse-charge invoice line must provide a VAT rate',
          field: `lines[${index}].taxRate`,
          actualValue:
            rate === null ? '' : String(rate),
        });
      },
    );

    /*
     * UAE-CON-006
     * Reverse-charge VAT line amount must be zero.
     * Maps to PINT-AE IBR-162-AE.
     */
    invoice.lines?.forEach(
      (line, index) => {
        const category =
          line.taxCategoryCode
            ?.trim()
            .toUpperCase() ?? '';

        if (category !== 'AE') {
          return;
        }

        const vatLineAmount =
          toNumber(line.vatLineAmountAED);

        const valid =
          vatLineAmount === 0;

        results.push({
          ruleCode: 'UAE-CON-006',
          ruleName:
            `Reverse-charge VAT line amount - Line ${index + 1}`,
          status: valid ? 'PASS' : 'FAIL',
          severity: 'ERROR',
          message: valid
            ? 'Reverse-charge VAT line amount is zero'
            : 'Reverse-charge VAT line amount must be zero',
          field:
            `lines[${index}].vatLineAmountAED`,
          actualValue:
            vatLineAmount === null
              ? ''
              : String(vatLineAmount),
        });
      },
    );

    /*
     * UAE-CON-007
     * Reverse-charge VAT breakdown tax amount must be zero.
     * Maps to ALIGNED-IBRP-AE-09-AE.
     */
    invoice.taxBreakdowns?.forEach(
      (taxBreakdown, index) => {
        const category =
          taxBreakdown.categoryCode
            ?.trim()
            .toUpperCase() ?? '';

        if (category !== 'AE') {
          return;
        }

        const taxAmount =
          toNumber(taxBreakdown.taxAmount);

        const valid =
          taxAmount === 0;

        results.push({
          ruleCode: 'UAE-CON-007',
          ruleName:
            `Reverse-charge VAT breakdown amount - ${index + 1}`,
          status: valid ? 'PASS' : 'FAIL',
          severity: 'ERROR',
          message: valid
            ? 'Reverse-charge VAT breakdown tax amount is zero'
            : 'Reverse-charge VAT breakdown tax amount must be zero',
          field:
            `taxBreakdowns[${index}].taxAmount`,
          actualValue:
            taxAmount === null
              ? ''
              : String(taxAmount),
        });
      },
    );

    /*
     * UAE-CON-008
     * Exempt VAT invoice line must not provide a VAT rate.
     */
    invoice.lines?.forEach(
      (line, index) => {
        const category =
          line.taxCategoryCode
            ?.trim()
            .toUpperCase() ?? '';

        if (category !== 'E') {
          return;
        }

        const rate = toNumber(line.taxRate);
        const valid = rate === null;

        results.push({
          ruleCode: 'UAE-CON-008',
          ruleName:
            `Exempt VAT rate absent - Line ${index + 1}`,
          status: valid ? 'PASS' : 'FAIL',
          severity: 'ERROR',
          message: valid
            ? 'Exempt invoice line does not provide a VAT rate'
            : 'Exempt invoice line must not provide a VAT rate',
          field: `lines[${index}].taxRate`,
          actualValue:
            rate === null ? '' : String(rate),
        });
      },
    );

    /*
     * UAE-CON-009
     * Exempt VAT invoice line must not provide
     * a VAT line amount.
     */
    invoice.lines?.forEach(
      (line, index) => {
        const category =
          line.taxCategoryCode
            ?.trim()
            .toUpperCase() ?? '';

        if (category !== 'E') {
          return;
        }

        const amount =
          toNumber(line.vatLineAmountAED);

        const valid = amount === null;

        results.push({
          ruleCode: 'UAE-CON-009',
          ruleName:
            `Exempt VAT line amount absent - Line ${index + 1}`,
          status: valid ? 'PASS' : 'FAIL',
          severity: 'ERROR',
          message: valid
            ? 'Exempt invoice line does not provide a VAT line amount'
            : 'Exempt invoice line must not provide a VAT line amount',
          field:
            `lines[${index}].vatLineAmountAED`,
          actualValue:
            amount === null ? '' : String(amount),
        });
      },
    );

    /*
     * UAE-CON-010
     * UAE exempt invoice line must provide
     * the VAT exemption reason code.
     */
    invoice.lines?.forEach(
      (line, index) => {
        const category =
          line.taxCategoryCode
            ?.trim()
            .toUpperCase() ?? '';

        if (category !== 'E') {
          return;
        }

        const exemptionCode =
          line.vatExemptionReasonCode?.trim() ?? '';

        const valid = exemptionCode.length > 0;

        results.push({
          ruleCode: 'UAE-CON-010',
          ruleName:
            `VAT exemption reason code - Line ${index + 1}`,
          status: valid ? 'PASS' : 'FAIL',
          severity: 'ERROR',
          message: valid
            ? 'Exempt invoice line provides a VAT exemption reason code'
            : 'Exempt invoice line must provide a VAT exemption reason code',
          field:
            `lines[${index}].vatExemptionReasonCode`,
          actualValue: exemptionCode,
        });
      },
    );

    /*
     * UAE-CON-011
     * Exempt VAT breakdown must not provide
     * a VAT rate.
     */
    invoice.taxBreakdowns?.forEach(
      (taxBreakdown, index) => {
        const category =
          taxBreakdown.categoryCode
            ?.trim()
            .toUpperCase() ?? '';

        if (category !== 'E') {
          return;
        }

        const rate =
          toNumber(taxBreakdown.taxRate);

        const valid = rate === null;

        results.push({
          ruleCode: 'UAE-CON-011',
          ruleName:
            `Exempt VAT rate absent - Tax Breakdown ${index + 1}`,
          status: valid ? 'PASS' : 'FAIL',
          severity: 'ERROR',
          message: valid
            ? 'Exempt VAT breakdown does not provide a VAT rate'
            : 'Exempt VAT breakdown must not provide a VAT rate',
          field:
            `taxBreakdowns[${index}].taxRate`,
          actualValue:
            rate === null ? '' : String(rate),
        });
      },
    );

    /*
     * UAE-CON-012
     * Exempt VAT breakdown tax amount must equal zero.
     */
    invoice.taxBreakdowns?.forEach(
      (taxBreakdown, index) => {
        const category =
          taxBreakdown.categoryCode
            ?.trim()
            .toUpperCase() ?? '';

        if (category !== 'E') {
          return;
        }

        const taxAmount =
          toNumber(taxBreakdown.taxAmount);

        const valid = taxAmount === 0;

        results.push({
          ruleCode: 'UAE-CON-012',
          ruleName:
            `Exempt VAT breakdown amount - ${index + 1}`,
          status: valid ? 'PASS' : 'FAIL',
          severity: 'ERROR',
          message: valid
            ? 'Exempt VAT breakdown tax amount is zero'
            : 'Exempt VAT breakdown tax amount must be zero',
          field:
            `taxBreakdowns[${index}].taxAmount`,
          actualValue:
            taxAmount === null
              ? ''
              : String(taxAmount),
        });
      },
    );

    /*
     * UAE N - Standard rate additional VAT structural rules
     */

    const nLines =
      invoice.lines?.filter(
        (line) =>
          line.taxCategoryCode
            ?.trim()
            .toUpperCase() === 'N',
      ) ?? [];

    const nBreakdowns =
      invoice.taxBreakdowns?.filter(
        (breakdown) =>
          breakdown.categoryCode
            ?.trim()
            .toUpperCase() === 'N',
      ) ?? [];

    /*
     * IBR-105-AE
     * An invoice containing N line(s) requires exactly one
     * Standard rate additional VAT breakdown.
     */
    if (nLines.length > 0) {
      const validN105 = nBreakdowns.length === 1;

      results.push({
        ruleCode: 'UAE-CON-N-105-AE',
        ruleName:
          'Standard rate additional VAT breakdown cardinality',
        status: validN105 ? 'PASS' : 'FAIL',
        severity: 'ERROR',
        message: validN105
          ? 'Invoice containing N lines has exactly one N VAT breakdown'
          : `Invoice containing N lines must have exactly one N VAT breakdown; found ${nBreakdowns.length}`,
        field: 'taxBreakdowns',
        actualValue: String(nBreakdowns.length),
      });
    }

    /*
     * IBR-111-AE
     * Each N invoice line VAT rate must be greater than zero.
     */
    nLines.forEach((line, index) => {
      const rate = toNumber(line.taxRate);
      const validN111 =
        rate !== null && rate > 0;

      results.push({
        ruleCode: 'UAE-CON-N-111-AE',
        ruleName:
          `Standard rate additional VAT line rate - ${index + 1}`,
        status: validN111 ? 'PASS' : 'FAIL',
        severity: 'ERROR',
        message: validN111
          ? 'Standard rate additional VAT line rate is greater than zero'
          : 'Standard rate additional VAT line rate must be greater than zero',
        field: `lines[${index}].taxRate`,
        actualValue:
          rate === null ? '' : String(rate),
      });
    });

    /*
     * IBR-114-AE
     * Document-level charges cannot use category N.
     */
    const nCharges =
      invoice.allowanceCharges?.filter(
        (item) =>
          item.type?.trim().toUpperCase() === 'CHARGE' &&
          item.taxCategoryCode
            ?.trim()
            .toUpperCase() === 'N',
      ) ?? [];

    results.push({
      ruleCode: 'UAE-CON-N-114-AE',
      ruleName:
        'Document-level charge cannot use Standard rate additional VAT',
      status: nCharges.length === 0 ? 'PASS' : 'FAIL',
      severity: 'ERROR',
      message:
        nCharges.length === 0
          ? 'No document-level charge uses VAT category N'
          : 'Document-level charge VAT category must not be N',
      field: 'allowanceCharges.taxCategoryCode',
      actualValue: String(nCharges.length),
    });

    /*
     * IBR-115-AE
     * Document-level allowances cannot use category N.
     */
    const nAllowances =
      invoice.allowanceCharges?.filter(
        (item) =>
          item.type?.trim().toUpperCase() === 'ALLOWANCE' &&
          item.taxCategoryCode
            ?.trim()
            .toUpperCase() === 'N',
      ) ?? [];

    results.push({
      ruleCode: 'UAE-CON-N-115-AE',
      ruleName:
        'Document-level allowance cannot use Standard rate additional VAT',
      status: nAllowances.length === 0 ? 'PASS' : 'FAIL',
      severity: 'ERROR',
      message:
        nAllowances.length === 0
          ? 'No document-level allowance uses VAT category N'
          : 'Document-level allowance VAT category must not be N',
      field: 'allowanceCharges.taxCategoryCode',
      actualValue: String(nAllowances.length),
    });
    return results;
  }
}