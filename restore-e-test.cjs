require('dotenv').config();

const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const invoiceId = '975b7b1e-24d4-4e95-badc-c4acfc011900';

async function main() {
  await prisma.$transaction(async (tx) => {

    const deletedBreakdowns =
      await tx.invoiceTaxBreakdown.deleteMany({
        where: {
          invoiceId,
          categoryCode: 'E',
        },
      });

    const deletedLines =
      await tx.invoiceLine.deleteMany({
        where: {
          invoiceId,
          lineIdentifier: 'E-TEST-1',
        },
      });

    await tx.invoice.update({
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

    console.log(
      `Deleted E breakdowns: ${deletedBreakdowns.count}`,
    );

    console.log(
      `Deleted E test lines: ${deletedLines.count}`,
    );
  });

  console.log('Clean S-only baseline restored.');
  console.log('Invoice net: 1000');
  console.log('VAT: 50');
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
