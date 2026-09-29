import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

try {
  const invoice = await prisma.invoice.findUnique({
    where: {
      id: '51c81ed9-25d5-4183-bc0c-e0f1013a5484',
    },
    include: {
      documents: true,
      lines: true,
      taxBreakdowns: true,
      parties: true,
      allowanceCharges: true,
    },
  });

  if (!invoice) {
    throw new Error('Invoice not found.');
  }

  console.dir(invoice, {
    depth: 5,
    colors: true,
  });

  console.log('');
  console.log('DOCUMENTS =', invoice.documents.length);
  console.log('LINES =', invoice.lines.length);
  console.log('TAX_BREAKDOWNS =', invoice.taxBreakdowns.length);
  console.log('PARTIES =', invoice.parties.length);
  console.log(
    'ALLOWANCE_CHARGES =',
    invoice.allowanceCharges.length,
  );

  console.log('');
  console.log(
    'NEGATIVE_FIXTURE_INSPECTION = COMPLETE',
  );
} finally {
  await prisma.$disconnect();
}
