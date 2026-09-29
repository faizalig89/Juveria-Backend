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

const tenantId =
  "773e148e-2042-4448-b49f-d9d24eaf537c";

let adapterSubmitCalls = 0;

const readinessService = {
  async evaluate() {
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
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Invoice>',
      '<ID>STAGE-15-CONCURRENCY-TEST</ID>',
      '</Invoice>',
    ].join("");
  },
};

const adapter = {
  providerName: "STAGE15_CONCURRENCY_MOCK",

  async submit(request) {
    adapterSubmitCalls++;

    // Deliberately hold the winner open so competing
    // requests hit the database concurrently.
    await new Promise(resolve =>
      setTimeout(resolve, 500)
    );

    return {
      provider: this.providerName,
      status: "ACCEPTED",
      providerReference:
        `CONCURRENCY-${request.invoiceId}`,
      submittedAt: new Date().toISOString(),
      message:
        "Stage 15 concurrency test accepted.",
    };
  },
};

try {
  const invoice =
    await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceTypeCode: true,
      },
    });

  if (!invoice) {
    throw new Error(
      "Golden invoice not found for concurrency test."
    );
  }

  /*
   * Clean ONLY previous records created by this
   * dedicated test provider.
   */
  await prisma.aspSubmission.deleteMany({
    where: {
      invoiceId,
      tenantId,
      provider:
        "STAGE15_CONCURRENCY_MOCK",
    },
  });

  const service = new AspService(
    prisma,
    readinessService,
    ublService,
    adapter,
  );

  console.log(
    "\n===== FIRING 10 CONCURRENT SUBMISSIONS ====="
  );

  const results = await Promise.all(
    Array.from(
      { length: 10 },
      () =>
        service.submit(
          invoiceId,
          tenantId,
          "stage15-concurrency-test",
        ),
    ),
  );

  const submissions =
    await prisma.aspSubmission.findMany({
      where: {
        invoiceId,
        tenantId,
        provider:
          "STAGE15_CONCURRENCY_MOCK",
      },
      include: {
        attempts: true,
      },
    });

  const ownerResults =
    results.filter(
      result => result.duplicate === false
    );

  const duplicateResults =
    results.filter(
      result => result.duplicate === true
    );

  const totalAttempts =
    submissions.reduce(
      (sum, submission) =>
        sum + submission.attempts.length,
      0,
    );

  const checks = {
    tenRequestsReturned:
      results.length === 10,

    exactlyOneOwner:
      ownerResults.length === 1,

    nineDuplicates:
      duplicateResults.length === 9,

    exactlyOneDurableSubmission:
      submissions.length === 1,

    exactlyOneAttempt:
      totalAttempts === 1,

    adapterCalledExactlyOnce:
      adapterSubmitCalls === 1,

    finalStatusAccepted:
      submissions.length === 1 &&
      submissions[0].status === "ACCEPTED",

    attemptStatusAccepted:
      submissions.length === 1 &&
      submissions[0].attempts.length === 1 &&
      submissions[0].attempts[0].status ===
        "ACCEPTED",
  };

  console.log(
    "\n===== CONCURRENCY RESULTS ====="
  );

  console.log({
    requests: results.length,
    owners: ownerResults.length,
    duplicates: duplicateResults.length,
    durableSubmissions:
      submissions.length,
    attempts: totalAttempts,
    adapterSubmitCalls,
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
    console.log("\nFAILED ASSERTIONS:");
    console.log(failed);

    throw new Error(
      "Stage 15.2 concurrency regression failed."
    );
  }

  console.log(
    "\nSTAGE_15_2_CONCURRENCY_REGRESSION_PASSED"
  );

  console.log(
    "10 REQUESTS -> 1 ASP CALL = PASS"
  );

  console.log(
    "DUPLICATE SUBMISSION PROTECTION = PASS"
  );
} finally {
  await prisma.$disconnect();
}
