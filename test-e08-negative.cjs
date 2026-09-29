require('dotenv').config();

const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const invoiceId = '975b7b1e-24d4-4e95-badc-c4acfc011900';

async function main() {
  const breakdown = await prisma.invoiceTaxBreakdown.findFirst({
    where: {
      invoiceId,
      categoryCode: 'E',
    },
  });

  if (!breakdown) {
    throw new Error('Temporary E breakdown not found');
  }

  await prisma.invoiceTaxBreakdown.update({
    where: { id: breakdown.id },
    data: {
      taxableAmount: 450,
    },
  });

  console.log('Negative E-08 test prepared.');
  console.log('E line total remains: 500');
  console.log('E breakdown taxable amount changed: 500 -> 450');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
