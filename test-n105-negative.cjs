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

  const line = await prisma.invoiceLine.findFirst({
    where: {
      invoiceId,
      taxCategoryCode: 'N',
    },
  });

  if (!line) {
    throw new Error('N line not found');
  }

  // Restore N-111 test mutation.
  await prisma.invoiceLine.update({
    where: { id: line.id },
    data: { taxRate: 5 },
  });

  const nBreakdowns =
    await prisma.invoiceTaxBreakdown.findMany({
      where: {
        invoiceId,
        categoryCode: 'N',
      },
    });

  if (nBreakdowns.length !== 1) {
    throw new Error(
      `Safety check failed: expected exactly 1 N breakdown, found ${nBreakdowns.length}`
    );
  }

  // Deliberately create a second N breakdown.
  await prisma.invoiceTaxBreakdown.create({
    data: {
      invoiceId,
      categoryCode: 'N',
      taxableAmount: 1000,
      taxAmount: 0,
      taxRate: 5,
    },
  });

  console.log('N line rate restored: 5');
  console.log('Second N breakdown created.');
  console.log('Expected N breakdown count: 2');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
