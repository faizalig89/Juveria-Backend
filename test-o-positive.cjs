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
    },
  });

  if (!invoice) {
    throw new Error('Test invoice not found');
  }

  if (invoice.lines.length !== 1) {
    throw new Error(
      `Expected clean baseline with exactly 1 line, found ${invoice.lines.length}`,
    );
  }

  if (invoice.taxBreakdowns.length !== 1) {
    throw new Error(
      `Expected exactly 1 tax breakdown, found ${invoice.taxBreakdowns.length}`,
    );
  }

  const line = invoice.lines[0];
  const breakdown = invoice.taxBreakdowns[0];

  if (
    line.taxCategoryCode !== 'S' ||
    breakdown.categoryCode !== 'S'
  ) {
    throw new Error(
      'Expected clean S-only baseline. Nothing changed.',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.invoiceLine.update({
      where: { id: line.id },
      data: {
        taxCategoryCode: 'O',
        taxRate: null,
        taxAmount: 0,
        vatLineAmountAED: 0,
        lineTotal: 1000,
        lineAmountAED: 1000,

        // We are testing calculation/rate rules first.
        vatExemptionReasonCode: null,
        vatExemptionReasonText: null,
      },
    });

    await tx.invoiceTaxBreakdown.update({
      where: { id: breakdown.id },
      data: {
        categoryCode: 'O',
        taxableAmount: 1000,
        taxAmount: 0,
        taxRate: null,
        vatExemptionReasonCode: null,
        vatExemptionReasonText: null,
      },
    });

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        lineNetTotal: 1000,
        allowanceTotal: 0,
        chargeTotal: 0,
        totalWithoutTax: 1000,
        totalTaxAmount: 0,
        totalWithTax: 1000,
        paidAmount: 0,
        roundingAmount: 0,
        amountDue: 1000,
        totalAmount: 1000,
      },
    });
  });

  console.log('O-only test scenario prepared.');
  console.log('Category: O');
  console.log('Line net: 1000');
  console.log('VAT rate: absent');
  console.log('Taxable amount: 1000');
  console.log('VAT amount: 0');
  console.log('Invoice total: 1000');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
