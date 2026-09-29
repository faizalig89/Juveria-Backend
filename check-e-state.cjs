require('dotenv').config();

const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const INVOICE_ID = '975b7b1e-24d4-4e95-badc-c4acfc011900';

async function main() {
  const invoice = await prisma.invoice.findUnique({
    where: { id: INVOICE_ID },
    include: {
      lines: true,
      taxBreakdowns: true,
    },
  });

  if (!invoice) throw new Error('Invoice not found');

  console.log('INVOICE:', invoice.invoiceNumber);
  console.log('LINE CATEGORY:', invoice.lines[0]?.taxCategoryCode);
  console.log('LINE RATE:', String(invoice.lines[0]?.taxRate));
  console.log('TAX CATEGORY:', invoice.taxBreakdowns[0]?.categoryCode);
  console.log('TAX RATE:', String(invoice.taxBreakdowns[0]?.taxRate));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
