import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const id = "d60f30b6-641c-4565-9520-2640ced4c1b0";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

let original = null;

try {
  original = await prisma.invoice.findUnique({
    where: { id },
    select: {
      invoiceTypeCode: true,
      creditNoteReasonCode: true,
      creditNoteReasonText: true,
      precedingInvoiceReference: true,
    },
  });

  if (!original) {
    throw new Error("381 FIXTURE NOT FOUND");
  }

  console.log("\n===== ORIGINAL =====");
  console.log(JSON.stringify(original, null, 2));

  await prisma.invoice.update({
    where: { id },
    data: {
      invoiceTypeCode: "381",
      creditNoteReasonCode: "VD",
      creditNoteReasonText: "Volume discount exception test",
      precedingInvoiceReference: null,
    },
  });

  const vd = await prisma.invoice.findUnique({
    where: { id },
    select: {
      invoiceTypeCode: true,
      creditNoteReasonCode: true,
      creditNoteReasonText: true,
      precedingInvoiceReference: true,
    },
  });

  console.log("\n===== VD TEST STATE =====");
  console.log(JSON.stringify(vd, null, 2));

  if (vd.invoiceTypeCode !== "381") {
    throw new Error("VD ASSERTION FAILED: TYPE != 381");
  }

  if (vd.creditNoteReasonCode !== "VD") {
    throw new Error("VD ASSERTION FAILED: REASON != VD");
  }

  if (vd.precedingInvoiceReference !== null) {
    throw new Error("VD ASSERTION FAILED: REFERENCE IS NOT NULL");
  }

  console.log("\nVD_DATABASE_STATE_PASSED");

} finally {

  if (original) {
    await prisma.invoice.update({
      where: { id },
      data: original,
    });

    const restored = await prisma.invoice.findUnique({
      where: { id },
      select: {
        invoiceTypeCode: true,
        creditNoteReasonCode: true,
        creditNoteReasonText: true,
        precedingInvoiceReference: true,
      },
    });

    console.log("\n===== RESTORED =====");
    console.log(JSON.stringify(restored, null, 2));

    if (JSON.stringify(restored) !== JSON.stringify(original)) {
      throw new Error("ORIGINAL STATE RESTORATION FAILED");
    }

    console.log("\nORIGINAL_STATE_RESTORED");
  }

  await prisma.$disconnect();
}