require('dotenv').config();

const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const invoiceId =
  '975b7b1e-24d4-4e95-badc-c4acfc011900';

async function main() {

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lines: true,
      taxBreakdowns: true,
      allowanceCharges: true,
    },
  });

  if (!invoice) {
    throw new Error('Test invoice not found');
  }

  if (invoice.lines.length !== 1) {
    throw new Error(
      `Expected exactly 1 invoice line, found ${invoice.lines.length}`
    );
  }

  if (invoice.taxBreakdowns.length !== 1) {
    throw new Error(
      `Expected exactly 1 tax breakdown, found ${invoice.taxBreakdowns.length}`
    );
  }

  const line = invoice.lines[0];
  const breakdown = invoice.taxBreakdowns[0];

  await prisma.invoiceLine.update({
    where: { id: line.id },
    data: {
      taxCategoryCode: 'S',
      taxRate: 5,
      taxAmount: 50,
      vatLineAmountAED: 50,
      lineNetAmount: 1000,
      lineTotal: 1050,
      lineAmountAED: 1050,
      vatExemptionReasonCode: null,
      vatExemptionReasonText: null,
    },
  });

  await prisma.invoiceTaxBreakdown.update({
    where: { id: breakdown.id },
    data: {
      categoryCode: 'S',
      taxableAmount: 1000,
      taxAmount: 50,
      taxRate: 5,
      vatExemptionReasonCode: null,
      vatExemptionReasonText: null,
    },
  });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      lineNetTotal: 1000,
      allowanceTotal: 0,
      chargeTotal: 0,
      totalWithoutTax: 1000,
      totalTaxAmount: 50,
      totalWithTax: 1050,
      paidAmount: 0,
      roundingAmount: 0,
      amountDue: 1050,
      totalAmount: 1050,
    },
  });

  console.log('S-only baseline restored.');
  console.log('Category: S');
  console.log('Line net: 1000');
  console.log('VAT rate: 5');
  console.log('VAT amount: 50');
  console.log('Invoice total: 1050');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
