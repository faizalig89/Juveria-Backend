import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const ID = "d60f30b6-641c-4565-9520-2640ced4c1b0";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

try {
  const before = await prisma.invoice.findUnique({
    where: { id: ID },
    select: {
      invoiceNumber: true,
      invoiceTypeCode: true,
      creditNoteReasonCode: true,
      creditNoteReasonText: true,
      precedingInvoiceReference: true,
    },
  });

  if (!before) {
    throw new Error("381 fixture not found");
  }

  console.log("\n===== BEFORE =====");
  console.log(before);

  const updated = await prisma.invoice.update({
    where: { id: ID },
    data: {
      creditNoteReasonCode: "DL8.61.1.A",
      creditNoteReasonText: "Synthetic test adjustment",
      precedingInvoiceReference: "UAE-TEST-20260924-163926",
    },
    select: {
      invoiceNumber: true,
      invoiceTypeCode: true,
      creditNoteReasonCode: true,
      creditNoteReasonText: true,
      precedingInvoiceReference: true,
    },
  });

  console.log("\n===== AFTER =====");
  console.log(updated);

  if (updated.invoiceTypeCode !== "381") {
    throw new Error("Invoice type is not 381");
  }

  if (updated.creditNoteReasonCode !== "DL8.61.1.A") {
    throw new Error("Reason code update failed");
  }

  if (
    updated.precedingInvoiceReference !==
    "UAE-TEST-20260924-163926"
  ) {
    throw new Error("Preceding invoice reference missing");
  }

  console.log("\n381_VALID_REASON_FIXTURE_READY");
} finally {
  await prisma.$disconnect();
}
