import { Injectable } from '@nestjs/common';
import {
  InvoiceRuleContext,
  RuleResult,
} from './rule.types.js';

@Injectable()
export class UaePintAeArithmeticValidator {
  private toNumber(value: unknown): number | null {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const numericValue = Number(value);

    return Number.isFinite(numericValue)
      ? numericValue
      : null;
  }

  private equalMoney(
    left: number,
    right: number,
  ): boolean {
    return Math.abs(left - right) < 0.005;
  }

  evaluate(invoice: InvoiceRuleContext): RuleResult[] {
    const results: RuleResult[] = [];

    // ========================================================
    // UAE-ARITH-001
    // Sum of invoice line net amounts = invoice line net total
    // PINT-AE: IBR-CO-10
    // ========================================================

    const lineNetTotal =
      this.toNumber(invoice.lineNetTotal);

    const lineNetAmounts =
      invoice.lines?.map((line) =>
        this.toNumber(line.lineNetAmount),
      ) ?? [];

    const allLineNetAmountsPresent =
      lineNetAmounts.length > 0 &&
      lineNetAmounts.every(
        (value) => value !== null,
      );

    if (
      lineNetTotal === null ||
      !allLineNetAmountsPresent
    ) {
      results.push({
        ruleCode: 'UAE-ARITH-001',
        ruleName: 'Invoice line net total reconciliation',
        status: 'SKIPPED',
        severity: 'ERROR',
        message:
          'Line net total reconciliation requires the invoice line net total and all invoice line net amounts',
        field: 'lineNetTotal',
        actualValue: '',
      });
    } else {
      const calculatedLineNetTotal =
        lineNetAmounts.reduce(
          (sum, value) => sum + (value ?? 0),
          0,
        );

      const valid = this.equalMoney(
        calculatedLineNetTotal,
        lineNetTotal,
      );

      results.push({
        ruleCode: 'UAE-ARITH-001',
        ruleName: 'Invoice line net total reconciliation',
        status: valid ? 'PASS' : 'FAIL',
        severity: 'ERROR',
        message: valid
          ? 'Invoice line net total equals the sum of invoice line net amounts'
          : 'Invoice line net total does not equal the sum of invoice line net amounts',
        field: 'lineNetTotal',
        actualValue:
          `${lineNetTotal} | calculated=${calculatedLineNetTotal}`,
      });
    }

    // ========================================================
    // UAE-ARITH-002
    // Sum of VAT category tax amounts = invoice total tax
    // PINT-AE: IBR-CO-14
    // ========================================================

    const totalTaxAmount =
      this.toNumber(invoice.totalTaxAmount);

    const breakdownTaxAmounts =
      invoice.taxBreakdowns?.map((breakdown) =>
        this.toNumber(breakdown.taxAmount),
      ) ?? [];

    const allBreakdownTaxAmountsPresent =
      breakdownTaxAmounts.length > 0 &&
      breakdownTaxAmounts.every(
        (value) => value !== null,
      );

    if (
      totalTaxAmount === null ||
      !allBreakdownTaxAmountsPresent
    ) {
      results.push({
        ruleCode: 'UAE-ARITH-002',
        ruleName: 'Invoice VAT total reconciliation',
        status: 'SKIPPED',
        severity: 'ERROR',
        message:
          'VAT total reconciliation requires the invoice total tax amount and all tax breakdown amounts',
        field: 'totalTaxAmount',
        actualValue: '',
      });
    } else {
      const calculatedTaxTotal =
        breakdownTaxAmounts.reduce(
          (sum, value) => sum + (value ?? 0),
          0,
        );

      const valid = this.equalMoney(
        calculatedTaxTotal,
        totalTaxAmount,
      );

      results.push({
        ruleCode: 'UAE-ARITH-002',
        ruleName: 'Invoice VAT total reconciliation',
        status: valid ? 'PASS' : 'FAIL',
        severity: 'ERROR',
        message: valid
          ? 'Invoice total tax amount equals the sum of tax breakdown amounts'
          : 'Invoice total tax amount does not equal the sum of tax breakdown amounts',
        field: 'totalTaxAmount',
        actualValue:
          `${totalTaxAmount} | calculated=${calculatedTaxTotal}`,
      });
    }

    // ========================================================
    // UAE-ARITH-003
    // Total without VAT + total VAT = total with VAT
    // PINT-AE: IBR-CO-15
    // ========================================================

    const totalWithoutTax =
      this.toNumber(invoice.totalWithoutTax);

    const totalWithTax =
      this.toNumber(invoice.totalWithTax);

    if (
      totalWithoutTax === null ||
      totalTaxAmount === null ||
      totalWithTax === null
    ) {
      results.push({
        ruleCode: 'UAE-ARITH-003',
        ruleName: 'Invoice total with tax reconciliation',
        status: 'SKIPPED',
        severity: 'ERROR',
        message:
          'Total-with-tax reconciliation requires total without tax, total tax and total with tax',
        field: 'totalWithTax',
        actualValue: '',
      });
    } else {
      const calculatedTotalWithTax =
        totalWithoutTax + totalTaxAmount;

      const valid = this.equalMoney(
        calculatedTotalWithTax,
        totalWithTax,
      );

      results.push({
        ruleCode: 'UAE-ARITH-003',
        ruleName: 'Invoice total with tax reconciliation',
        status: valid ? 'PASS' : 'FAIL',
        severity: 'ERROR',
        message: valid
          ? 'Invoice total with tax equals total without tax plus total tax'
          : 'Invoice total with tax does not equal total without tax plus total tax',
        field: 'totalWithTax',
        actualValue:
          `${totalWithTax} | calculated=${calculatedTotalWithTax}`,
      });
    }

    // ========================================================
    // UAE-ARITH-004
    // Total without VAT =
    // line net total - allowance total + charge total
    // PINT-AE: IBR-CO-13
    // ========================================================

    const allowanceTotal =
      this.toNumber(invoice.allowanceTotal);

    const chargeTotal =
      this.toNumber(invoice.chargeTotal);

    if (
      lineNetTotal === null ||
      allowanceTotal === null ||
      chargeTotal === null ||
      totalWithoutTax === null
    ) {
      results.push({
        ruleCode: 'UAE-ARITH-004',
        ruleName: 'Invoice total without tax reconciliation',
        status: 'SKIPPED',
        severity: 'ERROR',
        message:
          'Total-without-tax reconciliation requires line net total, allowance total, charge total and total without tax',
        field: 'totalWithoutTax',
        actualValue: '',
      });
    } else {
      const calculatedTotalWithoutTax =
        lineNetTotal - allowanceTotal + chargeTotal;

      const valid = this.equalMoney(
        calculatedTotalWithoutTax,
        totalWithoutTax,
      );

      results.push({
        ruleCode: 'UAE-ARITH-004',
        ruleName: 'Invoice total without tax reconciliation',
        status: valid ? 'PASS' : 'FAIL',
        severity: 'ERROR',
        message: valid
          ? 'Invoice total without tax equals line net total minus allowances plus charges'
          : 'Invoice total without tax does not equal line net total minus allowances plus charges',
        field: 'totalWithoutTax',
        actualValue:
          `${totalWithoutTax} | calculated=${calculatedTotalWithoutTax}`,
      });
    }

    // ========================================================
    // UAE-ARITH-005
    // Amount due =
    // total with VAT - paid amount + rounding amount
    // PINT-AE: IBR-CO-16
    // ========================================================

    const paidAmount =
      this.toNumber(invoice.paidAmount);

    const roundingAmount =
      this.toNumber(invoice.roundingAmount);

    const amountDue =
      this.toNumber(invoice.amountDue);

    if (
      totalWithTax === null ||
      paidAmount === null ||
      roundingAmount === null ||
      amountDue === null
    ) {
      results.push({
        ruleCode: 'UAE-ARITH-005',
        ruleName: 'Invoice amount due reconciliation',
        status: 'SKIPPED',
        severity: 'ERROR',
        message:
          'Amount-due reconciliation requires total with tax, paid amount, rounding amount and amount due',
        field: 'amountDue',
        actualValue: '',
      });
    } else {
      const calculatedAmountDue =
        totalWithTax - paidAmount + roundingAmount;

      const valid = this.equalMoney(
        calculatedAmountDue,
        amountDue,
      );

      results.push({
        ruleCode: 'UAE-ARITH-005',
        ruleName: 'Invoice amount due reconciliation',
        status: valid ? 'PASS' : 'FAIL',
        severity: 'ERROR',
        message: valid
          ? 'Invoice amount due equals total with tax minus paid amount plus rounding amount'
          : 'Invoice amount due does not equal total with tax minus paid amount plus rounding amount',
        field: 'amountDue',
        actualValue:
          `${amountDue} | calculated=${calculatedAmountDue}`,
      });
    }


    // ========================================================
    // UAE-ARITH-006
    // Sum of document-level allowance amounts = allowance total
    // PINT-AE: IBR-CO-11
    // ========================================================

    const documentAllowanceAmounts =
      (invoice.allowanceCharges ?? [])
        .filter((entry) => entry.type === 'ALLOWANCE')
        .map((entry) => this.toNumber(entry.amount));

    const hasInvalidAllowanceAmount =
      documentAllowanceAmounts.some((amount) => amount === null);

    if (allowanceTotal === null || hasInvalidAllowanceAmount) {
      results.push({
        ruleCode: 'UAE-ARITH-006',
        ruleName: 'Document allowance total reconciliation',
        status: 'SKIPPED',
        severity: 'ERROR',
        message:
          'Document allowance reconciliation requires a valid allowance total and valid allowance amounts',
        field: 'allowanceTotal',
        actualValue: '',
      });
    } else {
      const calculatedAllowanceTotal =
        documentAllowanceAmounts.reduce(
          (sum: number, amount) => sum + (amount ?? 0),
          0,
        );

      const valid = this.equalMoney(
        calculatedAllowanceTotal,
        allowanceTotal,
      );

      results.push({
        ruleCode: 'UAE-ARITH-006',
        ruleName: 'Document allowance total reconciliation',
        status: valid ? 'PASS' : 'FAIL',
        severity: 'ERROR',
        message: valid
          ? 'Document allowance total equals the sum of document-level allowance amounts'
          : 'Document allowance total does not equal the sum of document-level allowance amounts',
        field: 'allowanceTotal',
        actualValue:
          `${allowanceTotal} | calculated=${calculatedAllowanceTotal}`,
      });
    }

    // ========================================================
    // UAE-ARITH-007
    // Sum of document-level charge amounts = charge total
    // PINT-AE: IBR-CO-12
    // ========================================================

    const documentChargeAmounts =
      (invoice.allowanceCharges ?? [])
        .filter((entry) => entry.type === 'CHARGE')
        .map((entry) => this.toNumber(entry.amount));

    const hasInvalidChargeAmount =
      documentChargeAmounts.some((amount) => amount === null);

    if (chargeTotal === null || hasInvalidChargeAmount) {
      results.push({
        ruleCode: 'UAE-ARITH-007',
        ruleName: 'Document charge total reconciliation',
        status: 'SKIPPED',
        severity: 'ERROR',
        message:
          'Document charge reconciliation requires a valid charge total and valid charge amounts',
        field: 'chargeTotal',
        actualValue: '',
      });
    } else {
      const calculatedChargeTotal =
        documentChargeAmounts.reduce(
          (sum: number, amount) => sum + (amount ?? 0),
          0,
        );

      const valid = this.equalMoney(
        calculatedChargeTotal,
        chargeTotal,
      );

      results.push({
        ruleCode: 'UAE-ARITH-007',
        ruleName: 'Document charge total reconciliation',
        status: valid ? 'PASS' : 'FAIL',
        severity: 'ERROR',
        message: valid
          ? 'Document charge total equals the sum of document-level charge amounts'
          : 'Document charge total does not equal the sum of document-level charge amounts',
        field: 'chargeTotal',
        actualValue:
          `${chargeTotal} | calculated=${calculatedChargeTotal}`,
      });
    }
    return results;
  }
}
