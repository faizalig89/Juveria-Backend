import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoicePartyDto {
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

export class InvoiceTaxBreakdownDto {
  @IsOptional()
  @IsNumber()
  taxableAmount?: number;

  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsString()
  categoryCode?: string;

  @IsOptional()
  @IsNumber()
  taxRate?: number;
}

export class InvoiceLineDto {
  @IsString()
  @IsNotEmpty()
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
  lineNetAmount?: number;

  @IsOptional()
  @IsNumber()
  itemNetPrice?: number;

  @IsOptional()
  @IsNumber()
  itemGrossPrice?: number;

  @IsOptional()
  @IsNumber()
  priceBaseQuantity?: number;

  @IsOptional()
  @IsString()
  taxCategoryCode?: string;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  vatLineAmountAED?: number;

  @IsOptional()
  @IsNumber()
  lineAmountAED?: number;

  @IsOptional()
  @IsString()
  itemName?: string;
}

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  invoiceNumber!: string;

  @IsDateString()
  invoiceDate!: string;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsNumber()
  @Min(0)
  totalAmount!: number;

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
  @IsNumber()
  lineNetTotal?: number;

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
  amountDue?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoicePartyDto)
  parties?: InvoicePartyDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceTaxBreakdownDto)
  taxBreakdowns?: InvoiceTaxBreakdownDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines?: InvoiceLineDto[];
}