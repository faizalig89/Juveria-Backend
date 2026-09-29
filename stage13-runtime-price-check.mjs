import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const id = "d60f30b6-641c-4565-9520-2640ced4c1b0";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
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

  await prisma.invoice.update({
    where: { id },
    data: {
      invoiceTypeCode: "381",
      creditNoteReasonCode: "VD",
      creditNoteReasonText: "Volume discount exception test",
      precedingInvoiceReference: null,
    },
  });

  const login = await fetch("http://localhost:4000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "authtest@adescare-demo.com",
      password: "Test@12345",
    }),
  }).then(r => r.json());

  const response = await fetch(
    `http://localhost:4000/compliance/invoice/${id}/ubl`,
    {
      headers: {
        Authorization: `Bearer ${login.accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`UBL HTTP ${response.status}`);
  }

  const payload = await response.json();
  const xml = String(payload.xml ?? "");

  const start = xml.indexOf("<cac:Price>");
  const end = xml.indexOf("</cac:Price>", start);

  if (start < 0 || end < 0) {
    throw new Error("cac:Price not found in runtime XML");
  }

  const price = xml.slice(start, end + "</cac:Price>".length);

  console.log("\n===== RUNNING BACKEND PRICE XML =====");
  console.log(price);

  console.log("\n===== RUNTIME ASSERTIONS =====");
  console.log("BaseQuantity :", price.includes("<cbc:BaseQuantity"));
  console.log(
    "AllowanceCharge :",
    price.includes("<cac:AllowanceCharge>"),
  );
  console.log(
    "BaseAmount :",
    price.includes("<cbc:BaseAmount"),
  );

} finally {
  if (original) {
    await prisma.invoice.update({
      where: { id },
      data: original,
    });

    console.log("\nORIGINAL_381_FIXTURE_RESTORED");
  }

  await prisma.$disconnect();
}