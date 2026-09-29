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
  const result = await prisma.$transaction(async (tx) => {

    const deletedBreakdowns =
      await tx.invoiceTaxBreakdown.deleteMany({
        where: {
          invoiceId,
          categoryCode: 'AE',
        },
      });

    const deletedLines =
      await tx.invoiceLine.deleteMany({
        where: {
          invoiceId,
          lineIdentifier: 'AE-TEST-1',
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

    return {
      deletedBreakdowns: deletedBreakdowns.count,
      deletedLines: deletedLines.count,
    };
  });

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lines: true,
      taxBreakdowns: true,
      allowanceCharges: true,
    },
  });

  const aeLines =
    invoice.lines.filter(
      (line) => line.taxCategoryCode === 'AE',
    );

  const aeBreakdowns =
    invoice.taxBreakdowns.filter(
      (breakdown) => breakdown.categoryCode === 'AE',
    );

  console.log(
    'Deleted AE breakdowns:',
    result.deletedBreakdowns,
  );

  console.log(
    'Deleted AE test lines:',
    result.deletedLines,
  );

  console.log('Remaining AE lines:', aeLines.length);
  console.log(
    'Remaining AE breakdowns:',
    aeBreakdowns.length,
  );

  console.log('\nClean S-only baseline restored.');
  console.log(
    'Invoice net:',
    invoice.lineNetTotal?.toString(),
  );
  console.log(
    'VAT:',
    invoice.totalTaxAmount?.toString(),
  );
  console.log(
    'Invoice total:',
    invoice.totalWithTax?.toString(),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
