import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

export class InvoiceLineRemediationDto {
  @IsString()
  description!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsNumber()
  @Min(0)
  taxAmount!: number;

  @IsNumber()
  @Min(0)
  lineTotal!: number;

  @IsOptional()
  @IsString()
  lineIdentifier?: string;

  @IsOptional()
  @IsString()
  unitOfMeasureCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lineNetAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  itemNetPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  itemGrossPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceBaseQuantity?: number;

  @IsOptional()
  @IsString()
  taxCategoryCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsString()
  vatExemptionReasonCode?: string;

  @IsOptional()
  @IsString()
  vatExemptionReasonText?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vatLineAmountAED?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lineAmountAED?: number;

  @IsOptional()
  @IsString()
  itemName?: string;
}

export class InvoiceTaxBreakdownRemediationDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxableAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsString()
  categoryCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsString()
  vatExemptionReasonCode?: string;

  @IsOptional()
  @IsString()
  vatExemptionReasonText?: string;
}
export class InvoicePartyRemediationDto {
  @IsIn(['SELLER', 'BUYER'])
  role!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  electronicAddress?: string;

  @IsOptional()
  @IsString()
  electronicIdentifier?: string;

  @IsOptional()
  @IsString()
  legalRegistrationIdentifier?: string;

  @IsOptional()
  @IsString()
  legalRegistrationIdentifierType?: string;

  @IsOptional()
  @IsString()
  legalRegistrationAuthorityName?: string;

  @IsOptional()
  @IsString()
  taxIdentifier?: string;

  @IsOptional()
  @IsString()
  taxSchemeCode?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  countrySubdivision?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;
}
export class UpdateInvoiceRemediationDto {
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsString()
  jurisdiction?: string;

  @IsOptional()
  @IsString()
  invoiceTypeCode?: string;

  @IsOptional()
  @IsString()
  transactionTypeCode?: string;

  @IsOptional()
  @IsDateString()
  paymentDueDate?: string;

  @IsOptional()
  @IsString()
  businessProcessType?: string;

  @IsOptional()
  @IsString()
  specificationIdentifier?: string;

  @IsOptional()
  @IsString()
  paymentMeansTypeCode?: string;

  @IsOptional()
  @IsString()
  paymentAccountIdentifier?: string;

  @IsOptional()
  @IsString()
  creditNoteReasonCode?: string;

  @IsOptional()
  @IsString()
  creditNoteReasonText?: string;

  @IsOptional()
  @IsString()
  precedingInvoiceReference?: string;

  @IsOptional()
  @IsNumber()
  lineNetTotal?: number;

  @IsOptional()
  @IsNumber()
  allowanceTotal?: number;

  @IsOptional()
  @IsNumber()
  chargeTotal?: number;

  @IsOptional()
  @IsNumber()
  totalWithoutTax?: number;

  @IsOptional()
  @IsNumber()
  totalTaxAmount?: number;

  @IsOptional()
  @IsNumber()
  totalWithTax?: number;

  @IsOptional()
  @IsNumber()
  paidAmount?: number;

  @IsOptional()
  @IsNumber()
  roundingAmount?: number;

  @IsOptional()
  @IsNumber()
  amountDue?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoicePartyRemediationDto)
  parties?: InvoicePartyRemediationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineRemediationDto)
  lines?: InvoiceLineRemediationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceTaxBreakdownRemediationDto)
  taxBreakdowns?: InvoiceTaxBreakdownRemediationDto[];}
