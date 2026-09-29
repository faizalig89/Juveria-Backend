require('dotenv').config();

const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const INVOICE_ID =
  '975b7b1e-24d4-4e95-badc-c4acfc011900';

async function main() {
  const invoice = await prisma.invoice.findUnique({
    where: { id: INVOICE_ID },
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
      `Expected exactly 1 test line, found ${invoice.lines.length}`,
    );
  }

  if (invoice.taxBreakdowns.length !== 1) {
    throw new Error(
      `Expected exactly 1 tax breakdown, found ${invoice.taxBreakdowns.length}`,
    );
  }

  const line = invoice.lines[0];
  const tax = invoice.taxBreakdowns[0];

  // Safety check: do not mutate an unexpected invoice state.
  if (
    line.taxCategoryCode !== 'S' ||
    Number(line.taxRate) !== 5 ||
    tax.categoryCode !== 'S' ||
    Number(tax.taxRate) !== 5
  ) {
    throw new Error(
      'Invoice is not in expected S/5 baseline. Nothing changed.',
    );
  }

  console.log('BASELINE VERIFIED: S / 5%');

  try {
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
          taxRate: null,
          taxAmount: 0,
          vatLineAmountAED: null,
          lineTotal: 1000,
          lineAmountAED: 1000,
          vatExemptionReasonCode: 'DL8.46.1',
          vatExemptionReasonText:
            'Controlled development test exemption',
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
          vatExemptionReasonText:
            'Controlled development test exemption',
        },
      }),
    ]);

    console.log('VALID E SCENARIO INSTALLED');

    // Keep process alive so PowerShell can call API
    // before restoration.
    console.log('READY_FOR_API_TEST');

    await new Promise((resolve) => {
      process.stdin.resume();
      process.stdin.once('data', resolve);
    });
  } finally {
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

    console.log('S / 5% BASELINE RESTORED');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
