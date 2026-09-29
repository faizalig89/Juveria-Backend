require('dotenv').config();

const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const invoiceId = '975b7b1e-24d4-4e95-badc-c4acfc011900';

async function main() {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lines: true,
      taxBreakdowns: true,
    },
  });

  if (!invoice) {
    throw new Error('Test invoice not found');
  }

  const sourceLine = invoice.lines.find(
    (line) => line.taxCategoryCode === 'S',
  );

  if (!sourceLine) {
    throw new Error('Existing S line not found');
  }

  const existingAELine = invoice.lines.find(
    (line) => line.lineIdentifier === 'AE-TEST-1',
  );

  const existingAEBreakdown = invoice.taxBreakdowns.find(
    (breakdown) => breakdown.categoryCode === 'AE',
  );

  if (existingAELine || existingAEBreakdown) {
    throw new Error(
      'Temporary AE test data already exists. Restore before continuing.',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoiceLine.create({
      data: {
        invoiceId,

        description: 'Reverse-charge test service',
        quantity: 1,
        unitPrice: 500,
        taxAmount: 0,
        lineTotal: 500,

        lineIdentifier: 'AE-TEST-1',
        unitOfMeasureCode:
          sourceLine.unitOfMeasureCode ?? 'C62',

        lineNetAmount: 500,
        itemNetPrice: 500,
        itemGrossPrice: 500,
        priceBaseQuantity: 1,

        taxCategoryCode: 'AE',
        taxRate: 5,

        vatExemptionReasonCode: null,
        vatExemptionReasonText: null,

        vatLineAmountAED: 0,
        lineAmountAED: 500,

        itemName: 'Reverse-charge test service',
      },
    });

    await tx.invoiceTaxBreakdown.create({
      data: {
        invoiceId,

        taxableAmount: 500,
        taxAmount: 0,

        categoryCode: 'AE',
        taxRate: 5,

        vatExemptionReasonCode: null,
        vatExemptionReasonText: null,
      },
    });

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        lineNetTotal: 1500,
        allowanceTotal: 0,
        chargeTotal: 0,
        totalWithoutTax: 1500,

        // S contributes 50; AE contributes 0.
        totalTaxAmount: 50,

        totalWithTax: 1550,
        paidAmount: 0,
        roundingAmount: 0,
        amountDue: 1550,
        totalAmount: 1550,
      },
    });
  });

  console.log('Mixed S + AE test data prepared.');
  console.log('S taxable: 1000 @ 5% -> VAT 50');
  console.log('AE taxable: 500 @ 5% -> VAT 0');
  console.log('Invoice total tax: 50');
  console.log('Invoice total: 1550');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
