require('dotenv').config();
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.invoice.update({
    where: {
      id: '975b7b1e-24d4-4e95-badc-c4acfc011900',
    },
    data: {
      allowanceTotal: 100,
    },
  });

  console.log('ARITH-004 NEGATIVE TEST READY');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
