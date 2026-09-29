require('dotenv').config();
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const invoiceId = '975b7b1e-24d4-4e95-badc-c4acfc011900';

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      totalWithTax: 1060,
    },
  });

  console.log('ARITH-003 NEGATIVE TEST READY');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
