import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { AspService } from "./dist/asp/asp.service.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const invoiceId =
  "975b7b1e-24d4-4e95-badc-c4acfc011900";

const ownerTenantId =
  "773e148e-2042-4448-b49f-d9d24eaf537c";

const providerName =
  "STAGE15_TENANT_ISOLATION_MOCK";

let adapterCalls = 0;
let readinessCalls = 0;
let ublCalls = 0;

const readinessService = {
  async evaluate() {
    readinessCalls++;

    return {
      readinessStatus: "READY",
      internal: {
        passed: true,
        failedRules: 0,
      },
      official: {
        passed: true,
        totalFailures: 0,
      },
    };
  },
};

const ublService = {
  async generate() {
    ublCalls++;

    return [
      '<?xml version="1.0"?>',
      '<Invoice>',
      '<ID>TENANT-ISOLATION</ID>',
      '</Invoice>',
    ].join("");
  },
};

const adapter = {
  providerName,

  async submit(request) {
    adapterCalls++;

    return {
      provider: providerName,
      status: "ACCEPTED",
      providerReference:
        `TENANT-TEST-${request.invoiceId}`,
      submittedAt:
        new Date().toISOString(),
    };
  },
};

try {
  const ownerInvoice =
    await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId: ownerTenantId,
      },
      select: {
        id: true,
      },
    });

  if (!ownerInvoice) {
    throw new Error(
      "Golden invoice not found for owner tenant. STOP."
    );
  }

  /*
   * Find another existing tenant.
   * We do NOT create fake production tenant data.
   */
  const otherTenant =
    await prisma.tenant.findFirst({
      where: {
        id: {
          not: ownerTenantId,
        },
      },
      select: {
        id: true,
      },
    });

  if (!otherTenant) {
    throw new Error(
      "No second tenant exists for isolation test. STOP."
    );
  }

  await prisma.aspSubmission.deleteMany({
    where: {
      invoiceId,
      provider: providerName,
    },
  });

  const service = new AspService(
    prisma,
    readinessService,
    ublService,
    adapter,
  );

  console.log(
    "\n===== CROSS-TENANT SUBMISSION ATTEMPT ====="
  );

  let blocked = false;
  let errorName = null;
  let errorMessage = null;

  try {
    await service.submit(
      invoiceId,
      otherTenant.id,
      "stage15-cross-tenant-test",
    );
  } catch (error) {
    blocked = true;
    errorName =
      error?.constructor?.name ?? null;
    errorMessage =
      error instanceof Error
        ? error.message
        : String(error);
  }

  const foreignSubmissionRows =
    await prisma.aspSubmission.findMany({
      where: {
        invoiceId,
        tenantId: otherTenant.id,
        provider: providerName,
      },
    });

  const checks = {
    secondTenantExists:
      Boolean(otherTenant.id),

    crossTenantRequestBlocked:
      blocked === true,

    notFoundReturned:
      errorName ===
        "NotFoundException",

    correctSafetyMessage:
      errorMessage ===
        "Invoice not found for authenticated tenant.",

    readinessNeverReached:
      readinessCalls === 0,

    ublNeverGenerated:
      ublCalls === 0,

    adapterNeverCalled:
      adapterCalls === 0,

    noForeignSubmissionCreated:
      foreignSubmissionRows.length === 0,
  };

  console.log(
    "\n===== TENANT ISOLATION RESULTS ====="
  );

  console.log({
    ownerTenantId,
    attemptedTenantId:
      otherTenant.id,
    blocked,
    errorName,
    errorMessage,
    readinessCalls,
    ublCalls,
    adapterCalls,
    foreignSubmissionRows:
      foreignSubmissionRows.length,
  });

  console.log(
    "\n===== ASSERTIONS ====="
  );

  console.table(
    Object.entries(checks).map(
      ([name, value]) => ({
        name,
        value,
      }),
    ),
  );

  const failed =
    Object.entries(checks)
      .filter(([, value]) => value !== true)
      .map(([name]) => name);

  if (failed.length > 0) {
    console.log(
      "\nFAILED ASSERTIONS:"
    );

    console.log(failed);

    throw new Error(
      "Stage 15 tenant isolation regression failed. STOP."
    );
  }

  console.log(
    "\nSTAGE_15_TENANT_ISOLATION_REGRESSION_PASSED"
  );

  console.log(
    "CROSS-TENANT INVOICE ACCESS = BLOCKED"
  );

  console.log(
    "READINESS CALLS = 0"
  );

  console.log(
    "UBL GENERATION CALLS = 0"
  );

  console.log(
    "ASP ADAPTER CALLS = 0"
  );

  console.log(
    "FOREIGN SUBMISSION RECORDS = 0"
  );

  console.log(
    "EXTERNAL ASP CALLS = 0"
  );
} finally {
  await prisma.$disconnect();
}
