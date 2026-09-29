require('dotenv').config();
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const invoiceId = '975b7b1e-24d4-4e95-badc-c4acfc011900';

  await prisma.invoiceAllowanceCharge.deleteMany({
    where: { invoiceId },
  });

  await prisma.invoiceAllowanceCharge.create({
    data: {
      invoiceId,
      type: 'ALLOWANCE',
      amount: 100,
      reasonText: 'CO-11 runtime test allowance',
    },
  });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      allowanceTotal: 90,
      chargeTotal: 0,
      totalWithoutTax: 900,
      totalTaxAmount: 50,
      totalWithTax: 950,
      paidAmount: 0,
      roundingAmount: 0,
      amountDue: 950,
    },
  });

  console.log('CO-11 positive-test data prepared');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

