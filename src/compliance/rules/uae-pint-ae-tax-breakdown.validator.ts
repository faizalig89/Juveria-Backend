import { Injectable } from '@nestjs/common';
import {
  InvoiceAllowanceChargeRuleContext,
  InvoiceLineRuleContext,
  InvoiceRuleContext,
  InvoiceTaxBreakdownRuleContext,
  RuleResult,
} from './rule.types.js';

@Injectable()
export class UaePintAeTaxBreakdownValidator {
  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  private equalMoney(left: number, right: number): boolean {
    return Math.abs(left - right) < 0.005;
  }

  private sameRate(left: unknown, right: unknown): boolean {
    const leftRate = this.toNumber(left);
    const rightRate = this.toNumber(right);

    return (
      leftRate !== null &&
      rightRate !== null &&
      Math.abs(leftRate - rightRate) < 0.000001
    );
  }

  evaluate(invoice: InvoiceRuleContext): RuleResult[] {
    const results: RuleResult[] = [];

    const standardBreakdowns: InvoiceTaxBreakdownRuleContext[] =
      (invoice.taxBreakdowns ?? []).filter(
        (breakdown: InvoiceTaxBreakdownRuleContext) =>
          breakdown.categoryCode === 'S',
      );

    for (const breakdown of standardBreakdowns) {
      const rate = this.toNumber(breakdown.taxRate);
      const taxableAmount = this.toNumber(
        breakdown.taxableAmount,
      );

      if (rate === null || taxableAmount === null) {
        results.push({
          ruleCode: 'UAE-TAX-S-08',
          ruleName:
            'Standard-rated VAT taxable amount reconciliation',
          status: 'SKIPPED',
          severity: 'ERROR',
          message:
            'Standard-rated VAT reconciliation requires a valid VAT rate and taxable amount',
          field: 'taxBreakdowns.taxableAmount',
          actualValue: '',
        });

        continue;
      }

      const matchingLines: InvoiceLineRuleContext[] =
        invoice.lines.filter(
          (line: InvoiceLineRuleContext) =>
            line.taxCategoryCode === 'S' &&
            this.sameRate(line.taxRate, rate),
        );

      const matchingAllowances: InvoiceAllowanceChargeRuleContext[] =
        (invoice.allowanceCharges ?? []).filter(
          (entry: InvoiceAllowanceChargeRuleContext) =>
            entry.type === 'ALLOWANCE' &&
            entry.taxCategoryCode === 'S' &&
            this.sameRate(entry.taxRate, rate),
        );

      const matchingCharges: InvoiceAllowanceChargeRuleContext[] =
        (invoice.allowanceCharges ?? []).filter(
          (entry: InvoiceAllowanceChargeRuleContext) =>
            entry.type === 'CHARGE' &&
            entry.taxCategoryCode === 'S' &&
            this.sameRate(entry.taxRate, rate),
        );

      const lineAmounts: Array<number | null> =
        matchingLines.map(
          (line: InvoiceLineRuleContext) =>
            this.toNumber(line.lineNetAmount),
        );

      const allowanceAmounts: Array<number | null> =
        matchingAllowances.map(
          (entry: InvoiceAllowanceChargeRuleContext) =>
            this.toNumber(entry.amount),
        );

      const chargeAmounts: Array<number | null> =
        matchingCharges.map(
          (entry: InvoiceAllowanceChargeRuleContext) =>
            this.toNumber(entry.amount),
        );

      const invalidAmount =
        lineAmounts.some(
          (value: number | null) => value === null,
        ) ||
        allowanceAmounts.some(
          (value: number | null) => value === null,
        ) ||
        chargeAmounts.some(
          (value: number | null) => value === null,
        );

      if (invalidAmount) {
        results.push({
          ruleCode: 'UAE-TAX-S-08',
          ruleName:
            'Standard-rated VAT taxable amount reconciliation',
          status: 'SKIPPED',
          severity: 'ERROR',
          message:
            'Standard-rated VAT reconciliation contains an invalid line, allowance or charge amount',
          field: 'taxBreakdowns.taxableAmount',
          actualValue: '',
        });

        continue;
      }

      const lineTotal = lineAmounts.reduce(
        (sum: number, value: number | null) =>
          sum + (value ?? 0),
        0,
      );

      const allowanceTotal = allowanceAmounts.reduce(
        (sum: number, value: number | null) =>
          sum + (value ?? 0),
        0,
      );

      const chargeTotal = chargeAmounts.reduce(
        (sum: number, value: number | null) =>
          sum + (value ?? 0),
        0,
      );

      const calculatedTaxableAmount =
        lineTotal + chargeTotal - allowanceTotal;

      const valid = this.equalMoney(
        calculatedTaxableAmount,
        taxableAmount,
      );

      results.push({
        ruleCode: 'UAE-TAX-S-08',
        ruleName:
          'Standard-rated VAT taxable amount reconciliation',
        status: valid ? 'PASS' : 'FAIL',
        severity: 'ERROR',
        message: valid
          ? 'Standard-rated VAT taxable amount reconciles with matching lines, charges and allowances'
          : 'Standard-rated VAT taxable amount does not reconcile with matching lines, charges and allowances',
        field: 'taxBreakdowns.taxableAmount',
        actualValue:
          `${taxableAmount} | calculated=${calculatedTaxableAmount} | rate=${rate}`,
      });
    }

    // ALIGNED-IBRP-S-09
    // Standard-rated VAT tax amount calculation.
    for (const breakdown of standardBreakdowns) {
      const taxableAmountS09 = this.toNumber(
        breakdown.taxableAmount,
      );

      const rateS09 = this.toNumber(
        breakdown.taxRate,
      );

      const taxAmountS09 = this.toNumber(
        breakdown.taxAmount,
      );

      if (
        taxableAmountS09 === null ||
        rateS09 === null ||
        taxAmountS09 === null
      ) {
        results.push({
          ruleCode: 'UAE-TAX-S-09',
          ruleName:
            'Standard-rated VAT tax amount calculation',
          status: 'SKIPPED',
          severity: 'ERROR',
          message:
            'Standard-rated VAT tax calculation requires valid taxable amount, VAT rate and tax amount',
          field: 'taxBreakdowns.taxAmount',
          actualValue: '',
        });

        continue;
      }

      const calculatedTaxAmount =
        Math.round(
          taxableAmountS09 * (rateS09 / 100) * 100,
        ) / 100;

      const validTaxAmount = this.equalMoney(
        taxAmountS09,
        calculatedTaxAmount,
      );

      results.push({
        ruleCode: 'UAE-TAX-S-09',
        ruleName:
          'Standard-rated VAT tax amount calculation',
        status: validTaxAmount ? 'PASS' : 'FAIL',
        severity: 'ERROR',
        message: validTaxAmount
          ? 'Standard-rated VAT tax amount equals taxable amount multiplied by VAT rate'
          : 'Standard-rated VAT tax amount does not equal taxable amount multiplied by VAT rate',
        field: 'taxBreakdowns.taxAmount',
        actualValue:
          `${taxAmountS09} | calculated=${calculatedTaxAmount} | taxable=${taxableAmountS09} | rate=${rateS09}`,
      });
    }
    // ALIGNED-IBRP-Z-08
    // Zero-rated VAT taxable amount reconciliation.
    const zeroBreakdowns: InvoiceTaxBreakdownRuleContext[] =
      (invoice.taxBreakdowns ?? []).filter(
        (breakdown: InvoiceTaxBreakdownRuleContext) =>
          breakdown.categoryCode?.trim().toUpperCase() === 'Z',
      );

    for (const breakdown of zeroBreakdowns) {
      const taxableAmountZ = this.toNumber(
        breakdown.taxableAmount,
      );

      if (taxableAmountZ === null) {
        results.push({
          ruleCode: 'UAE-TAX-Z-08',
          ruleName:
            'Zero-rated VAT taxable amount reconciliation',
          status: 'SKIPPED',
          severity: 'ERROR',
          message:
            'Zero-rated VAT reconciliation requires a valid taxable amount',
          field: 'taxBreakdowns.taxableAmount',
          actualValue: '',
        });
      } else {
        const matchingLines =
          invoice.lines.filter(
            (line: InvoiceLineRuleContext) =>
              line.taxCategoryCode?.trim().toUpperCase() === 'Z',
          );

        const matchingAllowances =
          (invoice.allowanceCharges ?? []).filter(
            (entry: InvoiceAllowanceChargeRuleContext) =>
              entry.type === 'ALLOWANCE' &&
              entry.taxCategoryCode?.trim().toUpperCase() === 'Z',
          );

        const matchingCharges =
          (invoice.allowanceCharges ?? []).filter(
            (entry: InvoiceAllowanceChargeRuleContext) =>
              entry.type === 'CHARGE' &&
              entry.taxCategoryCode?.trim().toUpperCase() === 'Z',
          );

        const lineAmounts = matchingLines.map(
          (line: InvoiceLineRuleContext) =>
            this.toNumber(line.lineNetAmount),
        );

        const allowanceAmounts = matchingAllowances.map(
          (entry: InvoiceAllowanceChargeRuleContext) =>
            this.toNumber(entry.amount),
        );

        const chargeAmounts = matchingCharges.map(
          (entry: InvoiceAllowanceChargeRuleContext) =>
            this.toNumber(entry.amount),
        );

        const invalidAmount =
          lineAmounts.some(
            (value: number | null) => value === null,
          ) ||
          allowanceAmounts.some(
            (value: number | null) => value === null,
          ) ||
          chargeAmounts.some(
            (value: number | null) => value === null,
          );

        if (invalidAmount) {
          results.push({
            ruleCode: 'UAE-TAX-Z-08',
            ruleName:
              'Zero-rated VAT taxable amount reconciliation',
            status: 'SKIPPED',
            severity: 'ERROR',
            message:
              'Zero-rated reconciliation contains an invalid line, allowance or charge amount',
            field: 'taxBreakdowns.taxableAmount',
            actualValue: '',
          });
        } else {
          const lineTotalZ = lineAmounts.reduce(
            (sum: number, value: number | null) =>
              sum + (value ?? 0),
            0,
          );

          const allowanceTotalZ = allowanceAmounts.reduce(
            (sum: number, value: number | null) =>
              sum + (value ?? 0),
            0,
          );

          const chargeTotalZ = chargeAmounts.reduce(
            (sum: number, value: number | null) =>
              sum + (value ?? 0),
            0,
          );

          const calculatedTaxableAmountZ =
            lineTotalZ + chargeTotalZ - allowanceTotalZ;

          const validTaxableAmountZ = this.equalMoney(
            taxableAmountZ,
            calculatedTaxableAmountZ,
          );

          results.push({
            ruleCode: 'UAE-TAX-Z-08',
            ruleName:
              'Zero-rated VAT taxable amount reconciliation',
            status: validTaxableAmountZ ? 'PASS' : 'FAIL',
            severity: 'ERROR',
            message: validTaxableAmountZ
              ? 'Zero-rated VAT taxable amount reconciles with matching lines, charges and allowances'
              : 'Zero-rated VAT taxable amount does not reconcile with matching lines, charges and allowances',
            field: 'taxBreakdowns.taxableAmount',
            actualValue:
              `${taxableAmountZ} | calculated=${calculatedTaxableAmountZ}`,
          });
        }
      }

      // ALIGNED-IBRP-Z-09
      const taxAmountZ = this.toNumber(
        breakdown.taxAmount,
      );

      const validTaxAmountZ =
        taxAmountZ !== null &&
        this.equalMoney(taxAmountZ, 0);

      results.push({
        ruleCode: 'UAE-TAX-Z-09',
        ruleName:
          'Zero-rated VAT tax amount must be zero',
        status: validTaxAmountZ ? 'PASS' : 'FAIL',
        severity: 'ERROR',
        message: validTaxAmountZ
          ? 'Zero-rated VAT breakdown tax amount is zero'
          : 'Zero-rated VAT breakdown tax amount must equal zero',
        field: 'taxBreakdowns.taxAmount',
        actualValue:
          taxAmountZ === null ? '' : String(taxAmountZ),
      });

      // IBR-120-AE
      const rateZ = this.toNumber(
        breakdown.taxRate,
      );

      const validRateZ =
        rateZ !== null &&
        Math.abs(rateZ) < 0.000001;

      results.push({
        ruleCode: 'UAE-TAX-IBR-120-AE',
        ruleName:
          'Zero-rated VAT breakdown rate must be zero',
        status: validRateZ ? 'PASS' : 'FAIL',
        severity: 'ERROR',
        message: validRateZ
          ? 'Zero-rated VAT breakdown rate equals zero'
          : 'Zero-rated VAT breakdown rate must equal zero',
        field: 'taxBreakdowns.taxRate',
        actualValue:
          rateZ === null ? '' : String(rateZ),
      });
    }
    // ========================================================
    // ALIGNED-IBRP-E-08
    // Exempt VAT taxable amount reconciliation.
    // ========================================================

    const exemptBreakdowns: InvoiceTaxBreakdownRuleContext[] =
      (invoice.taxBreakdowns ?? []).filter(
        (breakdown: InvoiceTaxBreakdownRuleContext) =>
          breakdown.categoryCode?.trim().toUpperCase() === 'E',
      );

    for (const breakdown of exemptBreakdowns) {
      const taxableAmountE = this.toNumber(
        breakdown.taxableAmount,
      );

      if (taxableAmountE === null) {
        results.push({
          ruleCode: 'UAE-TAX-E-08',
          ruleName:
            'Exempt VAT taxable amount reconciliation',
          status: 'SKIPPED',
          severity: 'ERROR',
          message:
            'Exempt VAT reconciliation requires a valid taxable amount',
          field: 'taxBreakdowns.taxableAmount',
          actualValue: '',
        });
      } else {
        const matchingLinesE =
          invoice.lines.filter(
            (line: InvoiceLineRuleContext) =>
              line.taxCategoryCode?.trim().toUpperCase() === 'E',
          );

        const matchingAllowancesE =
          (invoice.allowanceCharges ?? []).filter(
            (entry: InvoiceAllowanceChargeRuleContext) =>
              entry.type === 'ALLOWANCE' &&
              entry.taxCategoryCode?.trim().toUpperCase() === 'E',
          );

        const matchingChargesE =
          (invoice.allowanceCharges ?? []).filter(
            (entry: InvoiceAllowanceChargeRuleContext) =>
              entry.type === 'CHARGE' &&
              entry.taxCategoryCode?.trim().toUpperCase() === 'E',
          );

        const lineAmountsE = matchingLinesE.map(
          (line: InvoiceLineRuleContext) =>
            this.toNumber(line.lineNetAmount),
        );

        const allowanceAmountsE = matchingAllowancesE.map(
          (entry: InvoiceAllowanceChargeRuleContext) =>
            this.toNumber(entry.amount),
        );

        const chargeAmountsE = matchingChargesE.map(
          (entry: InvoiceAllowanceChargeRuleContext) =>
            this.toNumber(entry.amount),
        );

        const invalidAmountE =
          lineAmountsE.some(
            (value: number | null) => value === null,
          ) ||
          allowanceAmountsE.some(
            (value: number | null) => value === null,
          ) ||
          chargeAmountsE.some(
            (value: number | null) => value === null,
          );

        if (invalidAmountE) {
          results.push({
            ruleCode: 'UAE-TAX-E-08',
            ruleName:
              'Exempt VAT taxable amount reconciliation',
            status: 'SKIPPED',
            severity: 'ERROR',
            message:
              'Exempt reconciliation contains an invalid line, allowance or charge amount',
            field: 'taxBreakdowns.taxableAmount',
            actualValue: '',
          });
        } else {
          const lineTotalE = lineAmountsE.reduce(
            (sum: number, value: number | null) =>
              sum + (value ?? 0),
            0,
          );

          const allowanceTotalE = allowanceAmountsE.reduce(
            (sum: number, value: number | null) =>
              sum + (value ?? 0),
            0,
          );

          const chargeTotalE = chargeAmountsE.reduce(
            (sum: number, value: number | null) =>
              sum + (value ?? 0),
            0,
          );

          const calculatedTaxableAmountE =
            lineTotalE + chargeTotalE - allowanceTotalE;

          const validTaxableAmountE = this.equalMoney(
            taxableAmountE,
            calculatedTaxableAmountE,
          );

          results.push({
            ruleCode: 'UAE-TAX-E-08',
            ruleName:
              'Exempt VAT taxable amount reconciliation',
            status: validTaxableAmountE ? 'PASS' : 'FAIL',
            severity: 'ERROR',
            message: validTaxableAmountE
              ? 'Exempt VAT taxable amount reconciles with matching lines, charges and allowances'
              : 'Exempt VAT taxable amount does not reconcile with matching lines, charges and allowances',
            field: 'taxBreakdowns.taxableAmount',
            actualValue:
              `${taxableAmountE} | calculated=${calculatedTaxableAmountE}`,
          });
        }
      }

      // ========================================================
      // ALIGNED-IBRP-E-09
      // Exempt VAT tax amount must be zero.
      // ========================================================

      const taxAmountE = this.toNumber(
        breakdown.taxAmount,
      );

      const validTaxAmountE =
        taxAmountE !== null &&
        this.equalMoney(taxAmountE, 0);

      results.push({
        ruleCode: 'UAE-TAX-E-09',
        ruleName:
          'Exempt VAT tax amount must be zero',
        status: validTaxAmountE ? 'PASS' : 'FAIL',
        severity: 'ERROR',
        message: validTaxAmountE
          ? 'Exempt VAT breakdown tax amount is zero'
          : 'Exempt VAT breakdown tax amount must equal zero',
        field: 'taxBreakdowns.taxAmount',
        actualValue:
          taxAmountE === null ? '' : String(taxAmountE),
      });
    }
    // ========================================================
    // ALIGNED-IBRP-AE-08-AE
    // Reverse-charge VAT taxable amount reconciliation.
    //
    // For each AE VAT breakdown rate:
    // taxable amount =
    //   matching AE line net amounts
    //   + matching AE document charges
    //   - matching AE document allowances.
    // ========================================================

    const reverseChargeBreakdowns:
      InvoiceTaxBreakdownRuleContext[] =
        (invoice.taxBreakdowns ?? []).filter(
          (breakdown: InvoiceTaxBreakdownRuleContext) =>
            breakdown.categoryCode?.trim().toUpperCase() === 'AE',
        );

    for (const breakdown of reverseChargeBreakdowns) {
      const taxableAmountAE = this.toNumber(
        breakdown.taxableAmount,
      );

      const rateAE = this.toNumber(
        breakdown.taxRate,
      );

      if (
        taxableAmountAE === null ||
        rateAE === null
      ) {
        results.push({
          ruleCode: 'UAE-TAX-AE-08',
          ruleName:
            'Reverse-charge VAT taxable amount reconciliation',
          status: 'SKIPPED',
          severity: 'ERROR',
          message:
            'Reverse-charge VAT reconciliation requires a valid taxable amount and VAT category rate',
          field: 'taxBreakdowns.taxableAmount',
          actualValue: '',
        });

        continue;
      }

      const matchingLinesAE =
        invoice.lines.filter(
          (line: InvoiceLineRuleContext) => {
            const category =
              line.taxCategoryCode
                ?.trim()
                .toUpperCase();

            const rate =
              this.toNumber(line.taxRate);

            return (
              category === 'AE' &&
              rate !== null &&
              this.sameRate(rate, rateAE)
            );
          },
        );

      const matchingAllowancesAE =
        (invoice.allowanceCharges ?? []).filter(
          (
            entry:
              InvoiceAllowanceChargeRuleContext,
          ) => {
            const category =
              entry.taxCategoryCode
                ?.trim()
                .toUpperCase();

            const rate =
              this.toNumber(entry.taxRate);

            return (
              entry.type === 'ALLOWANCE' &&
              category === 'AE' &&
              rate !== null &&
              this.sameRate(rate, rateAE)
            );
          },
        );

      const matchingChargesAE =
        (invoice.allowanceCharges ?? []).filter(
          (
            entry:
              InvoiceAllowanceChargeRuleContext,
          ) => {
            const category =
              entry.taxCategoryCode
                ?.trim()
                .toUpperCase();

            const rate =
              this.toNumber(entry.taxRate);

            return (
              entry.type === 'CHARGE' &&
              category === 'AE' &&
              rate !== null &&
              this.sameRate(rate, rateAE)
            );
          },
        );

      const lineAmountsAE =
        matchingLinesAE.map(
          (line: InvoiceLineRuleContext) =>
            this.toNumber(line.lineNetAmount),
        );

      const allowanceAmountsAE =
        matchingAllowancesAE.map(
          (
            entry:
              InvoiceAllowanceChargeRuleContext,
          ) =>
            this.toNumber(entry.amount),
        );

      const chargeAmountsAE =
        matchingChargesAE.map(
          (
            entry:
              InvoiceAllowanceChargeRuleContext,
          ) =>
            this.toNumber(entry.amount),
        );

      const invalidAmountAE =
        lineAmountsAE.some(
          (value: number | null) =>
            value === null,
        ) ||
        allowanceAmountsAE.some(
          (value: number | null) =>
            value === null,
        ) ||
        chargeAmountsAE.some(
          (value: number | null) =>
            value === null,
        );

      if (invalidAmountAE) {
        results.push({
          ruleCode: 'UAE-TAX-AE-08',
          ruleName:
            'Reverse-charge VAT taxable amount reconciliation',
          status: 'SKIPPED',
          severity: 'ERROR',
          message:
            'Reverse-charge reconciliation contains an invalid line, allowance or charge amount',
          field: 'taxBreakdowns.taxableAmount',
          actualValue: '',
        });

        continue;
      }

      const lineTotalAE =
        lineAmountsAE.reduce(
          (
            sum: number,
            value: number | null,
          ) => sum + (value ?? 0),
          0,
        );

      const allowanceTotalAE =
        allowanceAmountsAE.reduce(
          (
            sum: number,
            value: number | null,
          ) => sum + (value ?? 0),
          0,
        );

      const chargeTotalAE =
        chargeAmountsAE.reduce(
          (
            sum: number,
            value: number | null,
          ) => sum + (value ?? 0),
          0,
        );

      const calculatedTaxableAmountAE =
        lineTotalAE +
        chargeTotalAE -
        allowanceTotalAE;

      const validTaxableAmountAE =
        this.equalMoney(
          taxableAmountAE,
          calculatedTaxableAmountAE,
        );

      results.push({
        ruleCode: 'UAE-TAX-AE-08',
        ruleName:
          'Reverse-charge VAT taxable amount reconciliation',
        status:
          validTaxableAmountAE
            ? 'PASS'
            : 'FAIL',
        severity: 'ERROR',
        message:
          validTaxableAmountAE
            ? 'Reverse-charge VAT taxable amount reconciles with matching lines, charges and allowances at the same VAT rate'
            : 'Reverse-charge VAT taxable amount does not reconcile with matching lines, charges and allowances at the same VAT rate',
        field:
          'taxBreakdowns.taxableAmount',
        actualValue:
          `${taxableAmountAE} | calculated=${calculatedTaxableAmountAE} | rate=${rateAE}`,
      });
    }
    // ========================================================
    // ALIGNED-IBRP-O-08
    // Not-subject-to-VAT taxable amount reconciliation.
    //
    // taxable amount =
    //   O invoice line net amounts
    //   + O document charges
    //   - O document allowances
    // ========================================================

    const notSubjectBreakdowns:
      InvoiceTaxBreakdownRuleContext[] =
        (invoice.taxBreakdowns ?? []).filter(
          (breakdown: InvoiceTaxBreakdownRuleContext) =>
            breakdown.categoryCode?.trim().toUpperCase() === 'O',
        );

    for (const breakdown of notSubjectBreakdowns) {
      const taxableAmountO =
        this.toNumber(breakdown.taxableAmount);

      if (taxableAmountO === null) {
        results.push({
          ruleCode: 'UAE-TAX-O-08',
          ruleName:
            'Not-subject-to-VAT taxable amount reconciliation',
          status: 'SKIPPED',
          severity: 'ERROR',
          message:
            'Not-subject-to-VAT reconciliation requires a valid taxable amount',
          field: 'taxBreakdowns.taxableAmount',
          actualValue: '',
        });
      } else {
        const lineAmountsO =
          (invoice.lines ?? [])
            .filter(
              (line: InvoiceLineRuleContext) =>
                line.taxCategoryCode
                  ?.trim()
                  .toUpperCase() === 'O',
            )
            .map(
              (line: InvoiceLineRuleContext) =>
                this.toNumber(line.lineNetAmount),
            );

        const allowanceAmountsO =
          (invoice.allowanceCharges ?? [])
            .filter(
              (
                entry:
                  InvoiceAllowanceChargeRuleContext,
              ) =>
                entry.type === 'ALLOWANCE' &&
                entry.taxCategoryCode
                  ?.trim()
                  .toUpperCase() === 'O',
            )
            .map(
              (
                entry:
                  InvoiceAllowanceChargeRuleContext,
              ) => this.toNumber(entry.amount),
            );

        const chargeAmountsO =
          (invoice.allowanceCharges ?? [])
            .filter(
              (
                entry:
                  InvoiceAllowanceChargeRuleContext,
              ) =>
                entry.type === 'CHARGE' &&
                entry.taxCategoryCode
                  ?.trim()
                  .toUpperCase() === 'O',
            )
            .map(
              (
                entry:
                  InvoiceAllowanceChargeRuleContext,
              ) => this.toNumber(entry.amount),
            );

        const invalidAmountO =
          lineAmountsO.some(
            (value: number | null) =>
              value === null,
          ) ||
          allowanceAmountsO.some(
            (value: number | null) =>
              value === null,
          ) ||
          chargeAmountsO.some(
            (value: number | null) =>
              value === null,
          );

        if (invalidAmountO) {
          results.push({
            ruleCode: 'UAE-TAX-O-08',
            ruleName:
              'Not-subject-to-VAT taxable amount reconciliation',
            status: 'SKIPPED',
            severity: 'ERROR',
            message:
              'Not-subject-to-VAT reconciliation contains an invalid line, allowance or charge amount',
            field: 'taxBreakdowns.taxableAmount',
            actualValue: '',
          });
        } else {
          const lineTotalO =
            lineAmountsO.reduce(
              (
                sum: number,
                value: number | null,
              ) => sum + (value ?? 0),
              0,
            );

          const allowanceTotalO =
            allowanceAmountsO.reduce(
              (
                sum: number,
                value: number | null,
              ) => sum + (value ?? 0),
              0,
            );

          const chargeTotalO =
            chargeAmountsO.reduce(
              (
                sum: number,
                value: number | null,
              ) => sum + (value ?? 0),
              0,
            );

          const calculatedTaxableAmountO =
            lineTotalO +
            chargeTotalO -
            allowanceTotalO;

          const validO08 =
            this.equalMoney(
              taxableAmountO,
              calculatedTaxableAmountO,
            );

          results.push({
            ruleCode: 'UAE-TAX-O-08',
            ruleName:
              'Not-subject-to-VAT taxable amount reconciliation',
            status: validO08 ? 'PASS' : 'FAIL',
            severity: 'ERROR',
            message: validO08
              ? 'Not-subject-to-VAT taxable amount reconciles with O lines, charges and allowances'
              : 'Not-subject-to-VAT taxable amount does not reconcile with O lines, charges and allowances',
            field: 'taxBreakdowns.taxableAmount',
            actualValue:
              `${taxableAmountO} | calculated=${calculatedTaxableAmountO}`,
          });
        }
      }

      // ALIGNED-IBRP-O-09
      const taxAmountO =
        this.toNumber(breakdown.taxAmount);

      if (taxAmountO === null) {
        results.push({
          ruleCode: 'UAE-TAX-O-09',
          ruleName:
            'Not-subject-to-VAT tax amount must be zero',
          status: 'SKIPPED',
          severity: 'ERROR',
          message:
            'Not-subject-to-VAT tax amount is missing or invalid',
          field: 'taxBreakdowns.taxAmount',
          actualValue: '',
        });
      } else {
        const validO09 = taxAmountO === 0;

        results.push({
          ruleCode: 'UAE-TAX-O-09',
          ruleName:
            'Not-subject-to-VAT tax amount must be zero',
          status: validO09 ? 'PASS' : 'FAIL',
          severity: 'ERROR',
          message: validO09
            ? 'Not-subject-to-VAT tax amount is zero'
            : 'Not-subject-to-VAT tax amount must equal zero',
          field: 'taxBreakdowns.taxAmount',
          actualValue: String(taxAmountO),
        });
      }

      // ALIGNED-IBRP-O-11-AE
      const rateProvidedO =
        breakdown.taxRate !== null &&
        breakdown.taxRate !== undefined &&
        String(breakdown.taxRate).trim() !== '';

      results.push({
        ruleCode: 'UAE-TAX-O-11-AE',
        ruleName:
          'Not-subject-to-VAT breakdown rate must be absent',
        status: rateProvidedO ? 'FAIL' : 'PASS',
        severity: 'ERROR',
        message: rateProvidedO
          ? 'Not-subject-to-VAT VAT breakdown must not provide a VAT rate'
          : 'Not-subject-to-VAT VAT breakdown does not provide a VAT rate',
        field: 'taxBreakdowns.taxRate',
        actualValue: rateProvidedO
          ? String(breakdown.taxRate)
          : '',
      });
    }

    // ========================================================
    // N - Standard rate additional VAT
    // ========================================================

    const additionalVatBreakdowns =
      invoice.taxBreakdowns?.filter(
        (breakdown) =>
          breakdown.categoryCode
            ?.trim()
            .toUpperCase() === 'N',
      ) ?? [];

    for (const breakdown of additionalVatBreakdowns) {

      // IBR-102-AE
      //
      // For each N VAT breakdown rate, taxable amount equals
      // the sum of N invoice line net amounts having the same
      // VAT rate.
      //
      // Document-level N allowances and charges are deliberately
      // NOT included because IBR-114-AE / IBR-115-AE prohibit
      // category N on those structures.

      const taxableAmountN =
        this.toNumber(breakdown.taxableAmount);

      const rateN =
        this.toNumber(breakdown.taxRate);

      if (
        taxableAmountN === null ||
        rateN === null
      ) {
        results.push({
          ruleCode: 'UAE-TAX-N-102-AE',
          ruleName:
            'Standard rate additional VAT taxable amount reconciliation',
          status: 'SKIPPED',
          severity: 'ERROR',
          message:
            'Standard rate additional VAT taxable amount or VAT rate is missing or invalid',
          field:
            'taxBreakdowns.taxableAmount',
          actualValue: '',
        });
      } else {
        const matchingLines =
          invoice.lines?.filter((line) => {
            const category =
              line.taxCategoryCode
                ?.trim()
                .toUpperCase();

            const lineRate =
              this.toNumber(line.taxRate);

            return (
              category === 'N' &&
              lineRate !== null &&
              this.sameRate(lineRate, rateN)
            );
          }) ?? [];

        let calculatedTaxableN = 0;
        let invalidLineAmount = false;

        for (const line of matchingLines) {
          const amount =
            this.toNumber(line.lineNetAmount);

          if (amount === null) {
            invalidLineAmount = true;
            break;
          }

          calculatedTaxableN += amount;
        }

        if (invalidLineAmount) {
          results.push({
            ruleCode: 'UAE-TAX-N-102-AE',
            ruleName:
              'Standard rate additional VAT taxable amount reconciliation',
            status: 'SKIPPED',
            severity: 'ERROR',
            message:
              'A matching N invoice line has a missing or invalid line net amount',
            field:
              'lines.lineNetAmount',
            actualValue: '',
          });
        } else {
          const validN102 =
            this.equalMoney(
              taxableAmountN,
              calculatedTaxableN,
            );

          results.push({
            ruleCode: 'UAE-TAX-N-102-AE',
            ruleName:
              'Standard rate additional VAT taxable amount reconciliation',
            status: validN102
              ? 'PASS'
              : 'FAIL',
            severity: 'ERROR',
            message: validN102
              ? 'Standard rate additional VAT taxable amount reconciles with N invoice lines at the same VAT rate'
              : 'Standard rate additional VAT taxable amount does not reconcile with N invoice lines at the same VAT rate',
            field:
              'taxBreakdowns.taxableAmount',
            actualValue:
              `${taxableAmountN} | calculated=${calculatedTaxableN} | rate=${rateN}`,
          });
        }
      }

      // IBR-108-AE
      //
      // N VAT breakdown tax amount MUST equal zero.

      const taxAmountN =
        this.toNumber(breakdown.taxAmount);

      if (taxAmountN === null) {
        results.push({
          ruleCode: 'UAE-TAX-N-108-AE',
          ruleName:
            'Standard rate additional VAT tax amount must be zero',
          status: 'SKIPPED',
          severity: 'ERROR',
          message:
            'Standard rate additional VAT tax amount is missing or invalid',
          field:
            'taxBreakdowns.taxAmount',
          actualValue: '',
        });
      } else {
        const validN108 =
          taxAmountN === 0;

        results.push({
          ruleCode: 'UAE-TAX-N-108-AE',
          ruleName:
            'Standard rate additional VAT tax amount must be zero',
          status: validN108
            ? 'PASS'
            : 'FAIL',
          severity: 'ERROR',
          message: validN108
            ? 'Standard rate additional VAT tax amount is zero'
            : 'Standard rate additional VAT tax amount must equal zero',
          field:
            'taxBreakdowns.taxAmount',
          actualValue:
            String(taxAmountN),
        });
      }
    }
    return results;
  }
}
