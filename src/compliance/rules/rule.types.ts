export type RuleStatus = 'PASS' | 'FAIL' | 'SKIPPED';

export type RuleSeverity = 'ERROR' | 'WARNING';

export interface RuleResult {
  ruleCode: string;
  ruleName: string;
  status: RuleStatus;
  severity: RuleSeverity;
  message?: string;
  field?: string;
  actualValue?: string;
}

export interface InvoicePartyRuleContext {
  role: string;
  name?: string | null;
  electronicAddress?: string | null;
  electronicIdentifier?: string | null;
  legalRegistrationIdentifier?: string | null;
  legalRegistrationIdentifierType?: string | null;
  taxIdentifier?: string | null;
  taxSchemeCode?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  countrySubdivision?: string | null;
  countryCode?: string | null;
}

export interface InvoiceTaxBreakdownRuleContext {
  taxableAmount?: unknown;
  taxAmount?: unknown;
  categoryCode?: string | null;
  taxRate?: unknown;
  vatExemptionReasonCode?: string | null;
  vatExemptionReasonText?: string | null;
}

export interface InvoiceLineRuleContext {
  description: string;
  quantity?: unknown;
  unitPrice?: unknown;
  taxAmount?: unknown;
  lineTotal: unknown;

  lineIdentifier?: string | null;
  unitOfMeasureCode?: string | null;
  lineNetAmount?: unknown;
  itemNetPrice?: unknown;
  itemGrossPrice?: unknown;
  priceBaseQuantity?: unknown;
  taxCategoryCode?: string | null;
  taxRate?: unknown;
  vatExemptionReasonCode?: string | null;
  vatExemptionReasonText?: string | null;
  vatLineAmountAED?: unknown;
  lineAmountAED?: unknown;
  itemName?: string | null;
}


export interface InvoiceAllowanceChargeRuleContext {
  type: string;
  amount: unknown;
  reasonCode?: string | null;
  reasonText?: string | null;
  baseAmount?: unknown;
  percentage?: unknown;
  taxCategoryCode?: string | null;
  taxRate?: unknown;
}
export interface InvoiceRuleContext {
  invoiceNumber: string;
  invoiceDate: Date;
  currency: string;
  totalAmount: unknown;

  jurisdiction?: string | null;
  invoiceTypeCode?: string | null;
  transactionTypeCode?: string | null;
  paymentDueDate?: Date | null;
  businessProcessType?: string | null;
  specificationIdentifier?: string | null;
  paymentMeansTypeCode?: string | null;

  lineNetTotal?: unknown;
  allowanceTotal?: unknown;
  chargeTotal?: unknown;
  totalWithoutTax?: unknown;
  totalTaxAmount?: unknown;
  totalWithTax?: unknown;
  paidAmount?: unknown;
  roundingAmount?: unknown;
  amountDue?: unknown;

  documents: Array<{
    id: string;
  }>;

  parties?: InvoicePartyRuleContext[];
  taxBreakdowns?: InvoiceTaxBreakdownRuleContext[];
  allowanceCharges?: InvoiceAllowanceChargeRuleContext[];
  lines: InvoiceLineRuleContext[];
}

export interface InvoiceRulePack {
  readonly code: string;
  readonly name: string;

  evaluate(invoice: InvoiceRuleContext): RuleResult[];
}