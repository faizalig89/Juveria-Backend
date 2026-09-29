import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const id = "d60f30b6-641c-4565-9520-2640ced4c1b0";
const baseUrl = "http://localhost:4000";

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

  console.log("\nVD STATE APPLIED");

  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "authtest@adescare-demo.com",
      password: "Test@12345",
    }),
  });

  if (!loginResponse.ok) {
    throw new Error(`LOGIN FAILED: HTTP ${loginResponse.status}`);
  }

  const login = await loginResponse.json();

  if (!login.accessToken) {
    throw new Error("LOGIN FAILED: NO ACCESS TOKEN");
  }

  console.log("LOGIN_OK");

  const headers = {
    Authorization: `Bearer ${login.accessToken}`,
  };

  const ublResponse = await fetch(
    `${baseUrl}/compliance/invoice/${id}/ubl`,
    { headers },
  );

  if (!ublResponse.ok) {
    throw new Error(`UBL REQUEST FAILED: HTTP ${ublResponse.status}`);
  }

  const ublPayload = await ublResponse.json();
  const xml = String(ublPayload.xml ?? "");

  console.log("\n===== VD UBL ASSERTIONS =====");

  const checks = {
    creditNoteRoot: xml.includes("<CreditNote"),
    type381: xml.includes(
      "<cbc:CreditNoteTypeCode>381</cbc:CreditNoteTypeCode>",
    ),
    reasonVD: xml.includes(
      "<cbc:ResponseCode>VD</cbc:ResponseCode>",
    ),
    billingReference: xml.includes("<cac:BillingReference>"),
    creditNoteLine: xml.includes("<cac:CreditNoteLine>"),
    invoiceLine: xml.includes("<cac:InvoiceLine>"),
  };

  console.log(JSON.stringify(checks, null, 2));

  if (!checks.creditNoteRoot) {
    throw new Error("VD UBL FAILED: CREDIT NOTE ROOT MISSING");
  }

  if (!checks.type381) {
    throw new Error("VD UBL FAILED: TYPE 381 MISSING");
  }

  if (!checks.reasonVD) {
    throw new Error("VD UBL FAILED: VD RESPONSE CODE MISSING");
  }

  if (checks.billingReference) {
    throw new Error("VD UBL FAILED: BILLING REFERENCE MUST BE ABSENT");
  }

  if (!checks.creditNoteLine || checks.invoiceLine) {
    throw new Error("VD UBL FAILED: CREDIT NOTE LINE STRUCTURE INCORRECT");
  }

  console.log("VD_UBL_ASSERTION_PASSED");

  const validationResponse = await fetch(
    `${baseUrl}/compliance/invoice/${id}/pint-ae-validation`,
    {
      method: "GET",
      headers,
    },
  );

  if (!validationResponse.ok) {
    throw new Error(
      `PINT-AE VALIDATION REQUEST FAILED: HTTP ${validationResponse.status}`,
    );
  }

  const validation = await validationResponse.json();

  console.log("\n===== OFFICIAL PINT-AE RESULT =====");
  console.log(JSON.stringify(validation, null, 2));

  const sharedFailures =
    Number(validation?.shared?.failureCount ?? 0);

  const uaeFailures =
    Number(validation?.uae?.failureCount ?? 0);

  const totalFailures =
    Number(validation?.totalFailures ?? (sharedFailures + uaeFailures));

  if (
    sharedFailures !== 0 ||
    uaeFailures !== 0 ||
    totalFailures !== 0 ||
    validation?.passed !== true
  ) {
    throw new Error(
      `OFFICIAL VD VALIDATION FAILED: shared=${sharedFailures}, uae=${uaeFailures}, total=${totalFailures}`,
    );
  }

  console.log("\n==========================================");
  console.log("STAGE_13_5_OFFICIAL_VD_PASSED");
  console.log("381 + VD + NO BILLING REFERENCE = PASS");
  console.log("==========================================");

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

    if (JSON.stringify(restored) !== JSON.stringify(original)) {
      throw new Error("CRITICAL: ORIGINAL FIXTURE RESTORATION FAILED");
    }

    console.log("\nORIGINAL_381_FIXTURE_RESTORED");
  }

  await prisma.$disconnect();
}