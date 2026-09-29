export interface IngestedInvoiceParty {
  role: 'SELLER' | 'BUYER';
  name?: string;
  electronicAddress?: string;
  electronicIdentifier?: string;
  legalRegistrationIdentifier?: string;
  legalRegistrationIdentifierType?: string;
  legalRegistrationAuthorityName?: string;
  taxIdentifier?: string;
  taxSchemeCode?: string;
  addressLine1?: string;
  city?: string;
  countrySubdivision?: string;
  countryCode?: string;
}

export interface IngestedInvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  lineTotal: number;

  lineIdentifier?: string;
  unitOfMeasureCode?: string;
  lineNetAmount?: number;
  itemNetPrice?: number;
  itemGrossPrice?: number;
  priceBaseQuantity?: number;
  taxCategoryCode?: string;
  taxRate?: number;
  vatExemptionReasonCode?: string;
  vatExemptionReasonText?: string;
  vatLineAmountAED?: number;
  lineAmountAED?: number;
  itemName?: string;
}

export interface IngestedTaxBreakdown {
  taxableAmount?: number;
  taxAmount?: number;
  categoryCode?: string;
  taxRate?: number;
  vatExemptionReasonCode?: string;
  vatExemptionReasonText?: string;
}

export interface IngestedAllowanceCharge {
  type: 'ALLOWANCE' | 'CHARGE';
  amount: number;
  reasonCode?: string;
  reasonText?: string;
  baseAmount?: number;
  percentage?: number;
  taxCategoryCode?: string;
  taxRate?: number;
}

export interface IngestedInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  totalAmount: number;

  jurisdiction?: string;
  invoiceTypeCode?: string;
  transactionTypeCode?: string;
  paymentDueDate?: string;
  businessProcessType?: string;
  specificationIdentifier?: string;
  paymentMeansTypeCode?: string;
  paymentAccountIdentifier?: string;

  creditNoteReasonCode?: string;
  creditNoteReasonText?: string;
  precedingInvoiceReference?: string;

  lineNetTotal?: number;
  allowanceTotal?: number;
  chargeTotal?: number;
  totalWithoutTax?: number;
  totalTaxAmount?: number;
  totalWithTax?: number;
  paidAmount?: number;
  roundingAmount?: number;
  amountDue?: number;

  parties?: IngestedInvoiceParty[];
  taxBreakdowns?: IngestedTaxBreakdown[];
  lines?: IngestedInvoiceLine[];
  allowanceCharges?: IngestedAllowanceCharge[];
}

export type InvoiceIngestionSource =
  | 'JSON'
  | 'CSV'
  | 'XML';

export interface InvoiceIngestionResult {
  source: InvoiceIngestionSource;
  invoice: IngestedInvoice;
  warnings: string[];
}