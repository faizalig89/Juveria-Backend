require('dotenv').config();

const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const invoiceId = '975b7b1e-24d4-4e95-badc-c4acfc011900';

  const breakdown = await prisma.invoiceTaxBreakdown.findFirst({
    where: {
      invoiceId,
      categoryCode: 'S',
    },
  });

  if (!breakdown) {
    throw new Error('Standard-rated VAT breakdown not found');
  }

  await prisma.invoiceTaxBreakdown.update({
    where: { id: breakdown.id },
    data: { taxAmount: 50 },
  });

  console.log('S taxAmount restored: 50');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
