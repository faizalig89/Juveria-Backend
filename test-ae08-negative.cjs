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
  const aeBreakdowns =
    await prisma.invoiceTaxBreakdown.findMany({
      where: {
        invoiceId,
        categoryCode: 'AE',
      },
    });

  if (aeBreakdowns.length !== 1) {
    throw new Error(
      `Expected exactly 1 AE breakdown, found ${aeBreakdowns.length}`,
    );
  }

  console.log(
    'AE taxable amount before:',
    aeBreakdowns[0].taxableAmount?.toString(),
  );

  await prisma.invoiceTaxBreakdown.update({
    where: {
      id: aeBreakdowns[0].id,
    },
    data: {
      taxableAmount: 450,
    },
  });

  console.log('AE taxable amount changed: 500 -> 450');
  console.log('AE line remains: 500');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
