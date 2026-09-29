import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const sourceId = '975b7b1e-24d4-4e95-badc-c4acfc011900';
const creditNoteNumber = 'UAE-CN-TEST-001';

try {
  const source = await prisma.invoice.findUnique({
    where: { id: sourceId },
    include: {
      lines: true,
      parties: true,
      taxBreakdowns: true,
      allowanceCharges: true,
    },
  });

  if (!source) {
    throw new Error('Golden source invoice not found.');
  }

  const existing = await prisma.invoice.findFirst({
    where: {
      tenantId: source.tenantId,
      invoiceNumber: creditNoteNumber,
    },
  });

  if (existing) {
    console.log(`CREDIT_NOTE_ID=${existing.id}`);
    console.log(`CREDIT_NOTE_NUMBER=${existing.invoiceNumber}`);
    console.log('Credit Note fixture already exists.');
    process.exit(0);
  }

  const creditNote = await prisma.invoice.create({
    data: {
      tenantId: source.tenantId,
      uploadedById: source.uploadedById,

      invoiceNumber: creditNoteNumber,
      invoiceDate: new Date(),

      currency: source.currency,
      totalAmount: source.totalAmount,

      status: 'RECEIVED',
      complianceStatus: 'PENDING',

      jurisdiction: source.jurisdiction,
      invoiceTypeCode: '381',
      transactionTypeCode: source.transactionTypeCode,
      paymentDueDate: null,
      businessProcessType: source.businessProcessType,
      specificationIdentifier: source.specificationIdentifier,

      paymentMeansTypeCode: null,
      paymentAccountIdentifier: null,

      creditNoteReasonCode: 'AC',
      creditNoteReasonText: 'Synthetic test adjustment',
      precedingInvoiceReference: source.invoiceNumber,

      lineNetTotal: source.lineNetTotal,
      allowanceTotal: source.allowanceTotal,
      chargeTotal: source.chargeTotal,
      totalWithoutTax: source.totalWithoutTax,
      totalTaxAmount: source.totalTaxAmount,
      totalWithTax: source.totalWithTax,
      paidAmount: source.paidAmount,
      roundingAmount: source.roundingAmount,
      amountDue: source.amountDue,

      parties: {
        create: source.parties.map((p) => ({
          role: p.role,
          name: p.name,
          electronicAddress: p.electronicAddress,
          electronicIdentifier: p.electronicIdentifier,
          legalRegistrationIdentifier: p.legalRegistrationIdentifier,
          legalRegistrationIdentifierType: p.legalRegistrationIdentifierType,
          legalRegistrationAuthorityName: p.legalRegistrationAuthorityName,
          taxIdentifier: p.taxIdentifier,
          taxSchemeCode: p.taxSchemeCode,
          addressLine1: p.addressLine1,
          city: p.city,
          countrySubdivision: p.countrySubdivision,
          countryCode: p.countryCode,
        })),
      },

      lines: {
        create: source.lines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxAmount: line.taxAmount,
          lineTotal: line.lineTotal,

          lineIdentifier: line.lineIdentifier,
          unitOfMeasureCode: line.unitOfMeasureCode,
          lineNetAmount: line.lineNetAmount,
          itemNetPrice: line.itemNetPrice,
          itemGrossPrice: line.itemGrossPrice,
          priceBaseQuantity: line.priceBaseQuantity,
          taxCategoryCode: line.taxCategoryCode,
          taxRate: line.taxRate,
          vatExemptionReasonCode: line.vatExemptionReasonCode,
          vatExemptionReasonText: line.vatExemptionReasonText,
          vatLineAmountAED: line.vatLineAmountAED,
          lineAmountAED: line.lineAmountAED,
          itemName: line.itemName,
        })),
      },

      taxBreakdowns: {
        create: source.taxBreakdowns.map((tax) => ({
          taxableAmount: tax.taxableAmount,
          taxAmount: tax.taxAmount,
          categoryCode: tax.categoryCode,
          taxRate: tax.taxRate,
          vatExemptionReasonCode: tax.vatExemptionReasonCode,
          vatExemptionReasonText: tax.vatExemptionReasonText,
        })),
      },

      allowanceCharges: {
        create: source.allowanceCharges.map((ac) => ({
          type: ac.type,
          amount: ac.amount,
          reasonCode: ac.reasonCode,
          reasonText: ac.reasonText,
          baseAmount: ac.baseAmount,
          percentage: ac.percentage,
          taxCategoryCode: ac.taxCategoryCode,
          taxRate: ac.taxRate,
        })),
      },
    },

    include: {
      lines: true,
      parties: true,
      taxBreakdowns: true,
      allowanceCharges: true,
    },
  });

  console.log('');
  console.log('==========================================');
  console.log('JUVERIA STAGE 13 CREDIT NOTE CREATED');
  console.log('==========================================');
  console.log(`CREDIT_NOTE_ID=${creditNote.id}`);
  console.log(`NUMBER=${creditNote.invoiceNumber}`);
  console.log(`TYPE=${creditNote.invoiceTypeCode}`);
  console.log(`REASON=${creditNote.creditNoteReasonCode}`);
  console.log(`PRECEDING=${creditNote.precedingInvoiceReference}`);
  console.log(`LINES=${creditNote.lines.length}`);
  console.log(`PARTIES=${creditNote.parties.length}`);
  console.log(`TAX_BREAKDOWNS=${creditNote.taxBreakdowns.length}`);
  console.log('==========================================');
} finally {
  await prisma.$disconnect();
}