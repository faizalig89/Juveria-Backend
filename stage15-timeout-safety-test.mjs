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

const providerName =
  "STAGE15_TIMEOUT_MOCK";

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
      '<ID>STAGE-15-TIMEOUT-TEST</ID>',
      '</Invoice>',
    ].join("");
  },
};

const adapter = {
  providerName,

  async submit() {
    adapterSubmitCalls++;

    await new Promise(resolve =>
      setTimeout(resolve, 150)
    );

    throw new Error(
      "SIMULATED_NETWORK_TIMEOUT_AFTER_SEND"
    );
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
      },
    });

  if (!invoice) {
    throw new Error(
      "Golden invoice not found."
    );
  }

  /*
   * Delete ONLY previous records belonging
   * to this dedicated timeout test provider.
   */
  await prisma.aspSubmission.deleteMany({
    where: {
      invoiceId,
      tenantId,
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
    "\n===== FIRST SUBMISSION: SIMULATED TIMEOUT ====="
  );

  let firstRequestBlocked = false;
  let firstErrorBody = null;

  try {
    await service.submit(
      invoiceId,
      tenantId,
      "stage15-timeout-test",
    );
  } catch (error) {
    firstRequestBlocked = true;

    firstErrorBody =
      typeof error.getResponse === "function"
        ? error.getResponse()
        : {
            message:
              error instanceof Error
                ? error.message
                : String(error),
          };
  }

  const afterFirst =
    await prisma.aspSubmission.findMany({
      where: {
        invoiceId,
        tenantId,
        provider: providerName,
      },
      include: {
        attempts: true,
      },
    });

  console.log(
    "\n===== SECOND IDENTICAL SUBMISSION ====="
  );

  const secondResult =
    await service.submit(
      invoiceId,
      tenantId,
      "stage15-timeout-test",
    );

  const afterSecond =
    await prisma.aspSubmission.findMany({
      where: {
        invoiceId,
        tenantId,
        provider: providerName,
      },
      include: {
        attempts: true,
      },
    });

  const submission =
    afterSecond[0];

  const checks = {
    firstRequestBlocked:
      firstRequestBlocked === true,

    firstCreatedOneSubmission:
      afterFirst.length === 1,

    firstStatusUnknown:
      afterFirst.length === 1 &&
      afterFirst[0].status === "UNKNOWN",

    firstCreatedOneAttempt:
      afterFirst.length === 1 &&
      afterFirst[0].attempts.length === 1,

    firstAttemptUnknown:
      afterFirst.length === 1 &&
      afterFirst[0].attempts[0].status ===
        "UNKNOWN",

    reconciliationErrorStored:
      afterFirst.length === 1 &&
      afterFirst[0].attempts[0].errorCode ===
        "ASP_RESPONSE_UNKNOWN",

    originalErrorStored:
      afterFirst.length === 1 &&
      afterFirst[0].lastError ===
        "SIMULATED_NETWORK_TIMEOUT_AFTER_SEND",

    secondRecognizedDuplicate:
      secondResult.duplicate === true,

    stillOneSubmission:
      afterSecond.length === 1,

    stillOneAttempt:
      submission &&
      submission.attempts.length === 1,

    adapterCalledExactlyOnce:
      adapterSubmitCalls === 1,

    remainsUnknown:
      submission &&
      submission.status === "UNKNOWN",
  };

  console.log(
    "\n===== TIMEOUT SAFETY RESULTS ====="
  );

  console.log({
    firstRequestBlocked,
    firstErrorBody,
    secondDuplicate:
      secondResult.duplicate,
    durableSubmissions:
      afterSecond.length,
    attempts:
      submission?.attempts.length,
    adapterSubmitCalls,
    finalStatus:
      submission?.status,
    lastError:
      submission?.lastError,
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
      "Stage 15.3 timeout safety regression failed."
    );
  }

  console.log(
    "\nSTAGE_15_3_TIMEOUT_SAFETY_REGRESSION_PASSED"
  );

  console.log(
    "AMBIGUOUS OUTCOME -> UNKNOWN = PASS"
  );

  console.log(
    "SECOND REQUEST -> NO ADDITIONAL ASP CALL = PASS"
  );

  console.log(
    "AUTOMATIC RETRY BLOCKED = PASS"
  );

  console.log(
    "EXTERNAL ASP CALLS = 0"
  );

} finally {
  await prisma.$disconnect();
}
