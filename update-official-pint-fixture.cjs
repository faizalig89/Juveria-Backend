require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
});

const prisma = new PrismaClient({ adapter });

const INVOICE_ID = "975b7b1e-24d4-4e95-badc-c4acfc011900";

async function main() {
  const invoice = await prisma.invoice.findUnique({
    where: { id: INVOICE_ID },
    include: {
      parties: true,
      lines: true
    }
  });

  if (!invoice) throw new Error("Test invoice not found");

  // Synthetic format-valid UAE test identifier.
  // LOCAL VALIDATION ONLY - not a real TRN.
  const TEST_TIN = "100000000000003";

  await prisma.invoice.update({
    where: { id: INVOICE_ID },
    data: {
      paymentAccountIdentifier: "TEST-PAYMENT-ACCOUNT-001"
    }
  });

  for (const party of invoice.parties) {
    await prisma.invoiceParty.update({
      where: { id: party.id },
      data: {
        electronicAddress: TEST_TIN,
        taxIdentifier: TEST_TIN,
        legalRegistrationIdentifierType: null
      }
    });
  }

  for (const line of invoice.lines) {
    await prisma.invoiceLine.update({
      where: { id: line.id },
      data: {
        itemGrossPrice:
          line.itemGrossPrice ??
          line.itemNetPrice ??
          line.unitPrice,

        priceBaseQuantity:
          line.priceBaseQuantity ?? 1,

        itemName:
          line.itemName ??
          line.description
      }
    });
  }

  const check = await prisma.invoice.findUnique({
    where: { id: INVOICE_ID },
    include: {
      parties: true,
      lines: true
    }
  });

  console.log("\n===== FIXTURE UPDATED =====");
  console.log("Invoice:", check.id);
  console.log("Payment account:", check.paymentAccountIdentifier);

  for (const party of check.parties) {
    console.log(
      party.role,
      "| Endpoint:", party.electronicAddress,
      "| TRN:", party.taxIdentifier
    );
  }

  for (const line of check.lines) {
    console.log(
      "LINE",
      line.lineIdentifier,
      "| Description:", line.description,
      "| Gross:", String(line.itemGrossPrice),
      "| Base Qty:", String(line.priceBaseQuantity)
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
