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
    throw new Error('N invoice line not found');
  }

  if (Number(line.taxRate) !== 5) {
    throw new Error(
      `Safety check failed: expected N line rate 5, found ${line.taxRate}`
    );
  }

  await prisma.invoiceLine.update({
    where: { id: line.id },
    data: { taxRate: 0 },
  });

  console.log('N-111 negative scenario prepared.');
  console.log('N line VAT rate: 5 -> 0');
  console.log('N breakdown VAT rate remains: 5');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
