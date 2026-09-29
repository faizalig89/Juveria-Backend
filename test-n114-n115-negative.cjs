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

  // ----------------------------------------------------------
  // 1. Clean duplicate N breakdown from N-105 test
  // ----------------------------------------------------------

  const nBreakdowns =
    await prisma.invoiceTaxBreakdown.findMany({
      where: {
        invoiceId,
        categoryCode: 'N',
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

  if (nBreakdowns.length !== 2) {
    throw new Error(
      `Safety check failed: expected 2 N breakdowns, found ${nBreakdowns.length}`
    );
  }

  // Keep original, delete temporary duplicate.
  await prisma.invoiceTaxBreakdown.delete({
    where: {
      id: nBreakdowns[1].id,
    },
  });

  // ----------------------------------------------------------
  // 2. Safety check: no existing allowance/charge test records
  // ----------------------------------------------------------

  const existingNItems =
    await prisma.invoiceAllowanceCharge.findMany({
      where: {
        invoiceId,
        taxCategoryCode: 'N',
      },
    });

  if (existingNItems.length !== 0) {
    throw new Error(
      `Safety check failed: found ${existingNItems.length} existing N allowance/charge records`
    );
  }

  // ----------------------------------------------------------
  // 3. Create prohibited N charge + N allowance
  // ----------------------------------------------------------

  await prisma.invoiceAllowanceCharge.createMany({
    data: [
      {
        invoiceId,
        type: 'CHARGE',
        amount: 10,
        reasonText: 'Temporary N-114 test charge',
        taxCategoryCode: 'N',
        taxRate: 5,
      },
      {
        invoiceId,
        type: 'ALLOWANCE',
        amount: 10,
        reasonText: 'Temporary N-115 test allowance',
        taxCategoryCode: 'N',
        taxRate: 5,
      },
    ],
  });

  console.log('N-105 duplicate removed.');
  console.log('N breakdown count restored: 1');
  console.log('Temporary N charge created: 10');
  console.log('Temporary N allowance created: 10');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
