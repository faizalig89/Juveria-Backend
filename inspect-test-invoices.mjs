import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

try {
  const invoices = await prisma.invoice.findMany({
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      complianceStatus: true,
      invoiceTypeCode: true,
      totalAmount: true,
      currency: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
  });

  console.table(invoices);
} finally {
  await prisma.$disconnect();
}
