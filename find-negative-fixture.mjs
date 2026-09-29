import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const TENANT_ID =
  '773e148e-2042-4448-b49f-d9d24eaf537c';

try {
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId: TENANT_ID,
    },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      complianceStatus: true,
      jurisdiction: true,
      invoiceTypeCode: true,
      currency: true,
      totalAmount: true,
      _count: {
        select: {
          documents: true,
          lines: true,
          taxBreakdowns: true,
          parties: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.table(
    invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      complianceStatus:
        invoice.complianceStatus,
      jurisdiction: invoice.jurisdiction,
      type: invoice.invoiceTypeCode,
      currency: invoice.currency,
      total: invoice.totalAmount.toString(),
      documents: invoice._count.documents,
      lines: invoice._count.lines,
      tax: invoice._count.taxBreakdowns,
      parties: invoice._count.parties,
    })),
  );

  console.log('');
  console.log(
    'SAME_TENANT_NEGATIVE_SEARCH = COMPLETE',
  );
} finally {
  await prisma.$disconnect();
}
