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
        categoryCode: 'N',
      },
    });

  if (!breakdown) {
    throw new Error('N breakdown not found');
  }

  if (Number(breakdown.taxableAmount) !== 1000) {
    throw new Error(
      `Safety check failed: expected taxableAmount 1000, found ${breakdown.taxableAmount}`
    );
  }

  await prisma.invoiceTaxBreakdown.update({
    where: { id: breakdown.id },
    data: {
      taxableAmount: 900,
    },
  });

  console.log('N negative scenario prepared.');
  console.log('N breakdown taxable: 1000 -> 900');
  console.log('N line net remains: 1000');
  console.log('N VAT rate remains: 5');
  console.log('N tax amount remains: 0');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
