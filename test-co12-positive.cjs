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
    where: {
      invoiceId,
      type: 'CHARGE',
    },
  });

  await prisma.invoiceAllowanceCharge.create({
    data: {
      invoiceId,
      type: 'CHARGE',
      amount: 50,
      reasonText: 'CO-12 runtime test charge',
    },
  });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      allowanceTotal: 100,
      chargeTotal: 50,
      totalWithoutTax: 950,
      totalTaxAmount: 50,
      totalWithTax: 1000,
      paidAmount: 0,
      roundingAmount: 0,
      amountDue: 1000,
    },
  });

  console.log('CO-12 positive-test data prepared');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
