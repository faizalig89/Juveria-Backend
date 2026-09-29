require('dotenv').config();
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL
  })
});

const invoiceId = '975b7b1e-24d4-4e95-badc-c4acfc011900';

async function main() {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lines: true,
      taxBreakdowns: true,
      allowanceCharges: true
    }
  });

  if (!invoice) throw new Error('Invoice not found');
  if (invoice.lines.length !== 1)
    throw new Error(`Expected 1 line, found ${invoice.lines.length}`);
  if (invoice.taxBreakdowns.length !== 1)
    throw new Error(`Expected 1 breakdown, found ${invoice.taxBreakdowns.length}`);

  const line = invoice.lines[0];
  const breakdown = invoice.taxBreakdowns[0];

  const deleted = await prisma.invoiceAllowanceCharge.deleteMany({
    where: {
      invoiceId,
      taxCategoryCode: 'N'
    }
  });

  await prisma.$transaction([
    prisma.invoiceLine.update({
      where: { id: line.id },
      data: {
        taxCategoryCode: 'S',
        taxRate: 5,
        taxAmount: 50,
        vatLineAmountAED: 50,
        lineNetAmount: 1000,
        lineTotal: 1050,
        lineAmountAED: 1050,
        vatExemptionReasonCode: null,
        vatExemptionReasonText: null
      }
    }),

    prisma.invoiceTaxBreakdown.update({
      where: { id: breakdown.id },
      data: {
        categoryCode: 'S',
        taxableAmount: 1000,
        taxAmount: 50,
        taxRate: 5,
        vatExemptionReasonCode: null,
        vatExemptionReasonText: null
      }
    }),

    prisma.invoice.update({
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
        totalAmount: 1050
      }
    })
  ]);

  const check = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lines: true,
      taxBreakdowns: true,
      allowanceCharges: true
    }
  });

  console.log('');
  console.log('===== RESTORE COMPLETE =====');
  console.log('Deleted N allowance/charges:', deleted.count);
  console.log('Line category:', check.lines[0].taxCategoryCode);
  console.log('Line rate:', check.lines[0].taxRate.toString());
  console.log('Breakdown category:', check.taxBreakdowns[0].categoryCode);
  console.log('Breakdown taxable:', check.taxBreakdowns[0].taxableAmount.toString());
  console.log('Breakdown VAT:', check.taxBreakdowns[0].taxAmount.toString());
  console.log('Remaining allowance/charges:', check.allowanceCharges.length);
  console.log('Invoice VAT:', check.totalTaxAmount.toString());
  console.log('Invoice total:', check.totalWithTax.toString());
}

main()
  .catch(e => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
