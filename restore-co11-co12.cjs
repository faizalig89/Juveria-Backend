require('dotenv').config();
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const invoiceId = '975b7b1e-24d4-4e95-badc-c4acfc011900';

  const deleted = await prisma.invoiceAllowanceCharge.deleteMany({
    where: { invoiceId },
  });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      lineNetTotal: 1000,
      allowanceTotal: 0,
      chargeTotal: 0,
      totalWithoutTax: 1000,
      totalTaxAmount: 50,
      totalWithTax: 1050,
      paidAmount: 0,
      roundingAmount: 0,
      amountDue: 1050,
    },
  });

  console.log(`Clean baseline restored. Test records deleted: ${deleted.count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
