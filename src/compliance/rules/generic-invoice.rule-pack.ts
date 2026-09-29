import { Injectable } from '@nestjs/common';
import {
  InvoiceRuleContext,
  InvoiceRulePack,
  RuleResult,
} from './rule.types.js';

@Injectable()
export class GenericInvoiceRulePack implements InvoiceRulePack {
  readonly code = 'GENERIC';
  readonly name = 'Generic Invoice Validation';

  evaluate(invoice: InvoiceRuleContext): RuleResult[] {
    const results: RuleResult[] = [];

    const hasInvoiceNumber =
      !!invoice.invoiceNumber &&
      invoice.invoiceNumber.trim().length > 0;

    results.push({
      ruleCode: 'INV-001',
      ruleName: 'Invoice number present',
      status: hasInvoiceNumber ? 'PASS' : 'FAIL',
      severity: 'ERROR',
      message: hasInvoiceNumber
        ? 'Invoice number is present'
        : 'Invoice number is required',
      field: 'invoiceNumber',
      actualValue: invoice.invoiceNumber ?? '',
    });

    const validDate =
      invoice.invoiceDate instanceof Date &&
      !Number.isNaN(invoice.invoiceDate.getTime());

    results.push({
      ruleCode: 'INV-002',
      ruleName: 'Invoice date valid',
      status: validDate ? 'PASS' : 'FAIL',
      severity: 'ERROR',
      message: validDate
        ? 'Invoice date is valid'
        : 'Invoice date is invalid',
      field: 'invoiceDate',
      actualValue: validDate
        ? invoice.invoiceDate.toISOString()
        : '',
    });

    const supportedCurrencies = [
      'AED',
      'SAR',
      'USD',
      'EUR',
      'GBP',
      'INR',
      'QAR',
    ];

    const currency = invoice.currency.toUpperCase();
    const validCurrency =
      supportedCurrencies.includes(currency);

    results.push({
      ruleCode: 'INV-003',
      ruleName: 'Supported currency',
      status: validCurrency ? 'PASS' : 'FAIL',
      severity: 'ERROR',
      message: validCurrency
        ? `Currency ${currency} is supported`
        : `Currency ${currency} is not supported`,
      field: 'currency',
      actualValue: currency,
    });

    const totalAmount = Number(invoice.totalAmount);
    const validTotal =
      Number.isFinite(totalAmount) && totalAmount > 0;

    results.push({
      ruleCode: 'INV-004',
      ruleName: 'Positive invoice total',
      status: validTotal ? 'PASS' : 'FAIL',
      severity: 'ERROR',
      message: validTotal
        ? 'Invoice total is greater than zero'
        : 'Invoice total must be greater than zero',
      field: 'totalAmount',
      actualValue: String(invoice.totalAmount),
    });

    const hasDocument =
      invoice.documents.length > 0;

    results.push({
      ruleCode: 'INV-005',
      ruleName: 'Invoice document attached',
      status: hasDocument ? 'PASS' : 'FAIL',
      severity: 'ERROR',
      message: hasDocument
        ? 'Invoice document is attached'
        : 'Invoice document is required',
      field: 'documents',
      actualValue: invoice.documents.length.toString(),
    });

    let lineTotalsValid = true;
    let calculatedLineTotal = 0;

    if (invoice.lines.length > 0) {
      calculatedLineTotal = invoice.lines.reduce(
        (sum, line) => sum + Number(line.lineTotal),
        0,
      );

      lineTotalsValid =
        Math.abs(calculatedLineTotal - totalAmount) < 0.01;
    }

    results.push({
      ruleCode: 'INV-006',
      ruleName: 'Invoice line total consistency',
      status:
        invoice.lines.length === 0
          ? 'SKIPPED'
          : lineTotalsValid
            ? 'PASS'
            : 'FAIL',
      severity: 'ERROR',
      message:
        invoice.lines.length === 0
          ? 'No invoice lines available; check skipped'
          : lineTotalsValid
            ? 'Invoice line totals match invoice total'
            : 'Invoice line totals do not match invoice total',
      field: 'totalAmount',
      actualValue:
        invoice.lines.length === 0
          ? 'NO_LINES'
          : calculatedLineTotal.toString(),
    });

    return results;
  }
}