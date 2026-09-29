require('dotenv').config();

const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const INVOICE_ID = '975b7b1e-24d4-4e95-badc-c4acfc011900';

async function main() {
  const invoice = await prisma.invoice.findUnique({
    where: { id: INVOICE_ID },
    include: {
      lines: true,
      taxBreakdowns: true,
    },
  });

  if (!invoice) throw new Error('Invoice not found');
  if (invoice.lines.length !== 1) throw new Error('Expected exactly 1 line');
  if (invoice.taxBreakdowns.length !== 1) {
    throw new Error('Expected exactly 1 tax breakdown');
  }

  const line = invoice.lines[0];
  const tax = invoice.taxBreakdowns[0];

  await prisma.$transaction([
    prisma.invoice.update({
      where: { id: INVOICE_ID },
      data: {
        totalAmount: 1050,
        totalTaxAmount: 50,
        totalWithTax: 1050,
        amountDue: 1050,
      },
    }),

    prisma.invoiceLine.update({
      where: { id: line.id },
      data: {
        taxCategoryCode: 'S',
        taxRate: 5,
        taxAmount: 50,
        vatLineAmountAED: 50,
        lineTotal: 1050,
        lineAmountAED: 1050,
        vatExemptionReasonCode: null,
        vatExemptionReasonText: null,
      },
    }),

    prisma.invoiceTaxBreakdown.update({
      where: { id: tax.id },
      data: {
        categoryCode: 'S',
        taxRate: 5,
        taxAmount: 50,
        taxableAmount: 1000,
        vatExemptionReasonCode: null,
        vatExemptionReasonText: null,
      },
    }),
  ]);

  console.log('S BASELINE RESTORED');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
