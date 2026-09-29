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
  const breakdown =
    await prisma.invoiceTaxBreakdown.findFirst({
      where: {
        invoiceId,
        categoryCode: 'O',
      },
    });

  if (!breakdown) {
    throw new Error('O breakdown not found');
  }

  console.log(
    'O taxable before:',
    breakdown.taxableAmount?.toString(),
  );

  await prisma.invoiceTaxBreakdown.update({
    where: { id: breakdown.id },
    data: {
      taxableAmount: 900,
    },
  });

  console.log('O taxable changed: 1000 -> 900');
  console.log('O line remains: 1000');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
