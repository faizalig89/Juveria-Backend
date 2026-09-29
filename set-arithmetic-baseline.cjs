require('dotenv').config();
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const invoiceId = '975b7b1e-24d4-4e95-badc-c4acfc011900';

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      allowanceTotal: 0,
      chargeTotal: 0,
      paidAmount: 0,
      roundingAmount: 0,
    },
    select: {
      lineNetTotal: true,
      allowanceTotal: true,
      chargeTotal: true,
      totalWithoutTax: true,
      totalTaxAmount: true,
      totalWithTax: true,
      paidAmount: true,
      roundingAmount: true,
      amountDue: true,
    },
  });

  console.log(invoice);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
