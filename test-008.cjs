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

  const line = invoice.lines[0];
  const tax = invoice.taxBreakdowns[0];

  await prisma.$transaction([
    prisma.invoice.update({
      where: { id: INVOICE_ID },
      data: {
        totalAmount: 1000,
        totalTaxAmount: 0,
        totalWithTax: 1000,
        amountDue: 1000,
      },
    }),
    prisma.invoiceLine.update({
      where: { id: line.id },
      data: {
        taxCategoryCode: 'E',
        taxRate: 5,
        taxAmount: 0,
        vatLineAmountAED: null,
        lineTotal: 1000,
        lineAmountAED: 1000,
        vatExemptionReasonCode: 'DL8.46.1',
      },
    }),
    prisma.invoiceTaxBreakdown.update({
      where: { id: tax.id },
      data: {
        categoryCode: 'E',
        taxRate: null,
        taxAmount: 0,
        taxableAmount: 1000,
        vatExemptionReasonCode: 'DL8.46.1',
      },
    }),
  ]);

  console.log('TEST 008 INSTALLED');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

