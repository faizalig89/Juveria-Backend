require('dotenv').config();

const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const invoiceId = '975b7b1e-24d4-4e95-badc-c4acfc011900';

async function main() {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lines: true,
      taxBreakdowns: true,
    },
  });

  if (!invoice) {
    throw new Error('Test invoice not found');
  }

  const sourceLine = invoice.lines.find(
    (line) => line.taxCategoryCode === 'S',
  );

  if (!sourceLine) {
    throw new Error('Existing S line not found');
  }

  const existingETestLine = invoice.lines.find(
    (line) => line.lineIdentifier === 'E-TEST-1',
  );

  const existingEBreakdown = invoice.taxBreakdowns.find(
    (breakdown) => breakdown.categoryCode === 'E',
  );

  if (existingETestLine || existingEBreakdown) {
    throw new Error(
      'Temporary E test data already exists. Restore baseline first.',
    );
  }

  /*
   * Use a non-empty exemption reason so the existing
   * UAE-CON-010 rule can be exercised.
   *
   * The exact code-list validation is handled by the
   * existing code-list validator.
   */
  const exemptionCode =
    sourceLine.vatExemptionReasonCode ??
    'VATEX-AE';

  await prisma.$transaction(async (tx) => {
    await tx.invoiceLine.create({
      data: {
        invoiceId,
        description: 'Exempt test service',
        quantity: 1,
        unitPrice: 500,
        taxAmount: 0,
        lineTotal: 500,

        lineIdentifier: 'E-TEST-1',
        unitOfMeasureCode:
          sourceLine.unitOfMeasureCode ?? 'C62',

        lineNetAmount: 500,
        itemNetPrice: 500,
        itemGrossPrice: 500,
        priceBaseQuantity: 1,

        taxCategoryCode: 'E',

        /*
         * E must not provide a VAT rate.
         */
        taxRate: null,

        vatExemptionReasonCode: exemptionCode,
        vatExemptionReasonText:
          'Exempt supply test',

        vatLineAmountAED: 0,
        lineAmountAED: 500,

        itemName: 'Exempt test service',
      },
    });

    await tx.invoiceTaxBreakdown.create({
      data: {
        invoiceId,
        taxableAmount: 500,
        taxAmount: 0,
        categoryCode: 'E',

        /*
         * E tax breakdown does not need a rate.
         */
        taxRate: null,

        vatExemptionReasonCode: exemptionCode,
        vatExemptionReasonText:
          'Exempt supply test',
      },
    });

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        lineNetTotal: 1500,
        allowanceTotal: 0,
        chargeTotal: 0,
        totalWithoutTax: 1500,
        totalTaxAmount: 50,
        totalWithTax: 1550,
        paidAmount: 0,
        roundingAmount: 0,
        amountDue: 1550,
        totalAmount: 1550,
      },
    });
  });

  console.log('Mixed S + E test data prepared.');
  console.log('S taxable: 1000 @ 5% -> VAT 50');
  console.log('E taxable: 500 -> VAT 0');
  console.log('Invoice total: 1550');
  console.log(`E exemption code used: ${exemptionCode}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
