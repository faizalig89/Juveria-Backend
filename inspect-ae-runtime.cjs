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
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lines: true,
      taxBreakdowns: true,
      allowanceCharges: true,
    },
  });

  console.log('\nAE LINES');
  console.dir(
    invoice.lines
      .filter(x => x.taxCategoryCode === 'AE')
      .map(x => ({
        id: x.id,
        lineIdentifier: x.lineIdentifier,
        lineNetAmount: x.lineNetAmount?.toString(),
        category: x.taxCategoryCode,
        rate: x.taxRate?.toString(),
        taxAmount: x.taxAmount?.toString(),
      })),
    { depth: null }
  );

  console.log('\nAE TAX BREAKDOWNS');
  console.dir(
    invoice.taxBreakdowns
      .filter(x => x.categoryCode === 'AE')
      .map(x => ({
        id: x.id,
        taxableAmount: x.taxableAmount?.toString(),
        taxAmount: x.taxAmount?.toString(),
        category: x.categoryCode,
        rate: x.taxRate?.toString(),
      })),
    { depth: null }
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
