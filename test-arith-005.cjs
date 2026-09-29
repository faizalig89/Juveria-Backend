require('dotenv').config();
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const invoice = await prisma.invoice.update({
    where: {
      id: '975b7b1e-24d4-4e95-badc-c4acfc011900',
    },
    data: {
      allowanceTotal: 0,
      paidAmount: 100,
    },
    select: {
      allowanceTotal: true,
      paidAmount: true,
      totalWithTax: true,
      roundingAmount: true,
      amountDue: true,
    },
  });

  console.log(invoice);
  console.log('ARITH-004 RESTORED - ARITH-005 NEGATIVE TEST READY');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
