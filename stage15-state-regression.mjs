import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { AspService } from "./dist/asp/asp.service.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const tenantId =
  "773e148e-2042-4448-b49f-d9d24eaf537c";

const invoice380 =
  "975b7b1e-24d4-4e95-badc-c4acfc011900";

const creditNote381 =
  "d60f30b6-641c-4565-9520-2640ced4c1b0";

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

function makeUblService(label) {
  return {
    async generate(invoiceId) {
      return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<Document test="${label}">`,
        `<ID>${invoiceId}</ID>`,
        '</Document>',
      ].join("");
    },
  };
}

async function clean(provider) {
  await prisma.aspSubmission.deleteMany({
    where: {
      tenantId,
      provider,
    },
  });
}

async function runScenario({
  name,
  invoiceId,
  provider,
  resultStatus,
}) {
  await clean(provider);

  let adapterCalls = 0;

  const adapter = {
    providerName: provider,

    async submit(request) {
      adapterCalls++;

      return {
        provider,
        status: resultStatus,
        providerReference:
          `${provider}-${request.invoiceId}`,
        submittedAt:
          new Date().toISOString(),
        message:
          `Simulated ${resultStatus}`,
      };
    },
  };

  const service = new AspService(
    prisma,
    readinessService,
    makeUblService(name),
    adapter,
  );

  const first =
    await service.submit(
      invoiceId,
      tenantId,
      "stage15-state-test",
    );

  const second =
    await service.submit(
      invoiceId,
      tenantId,
      "stage15-state-test",
    );

  const rows =
    await prisma.aspSubmission.findMany({
      where: {
        invoiceId,
        tenantId,
        provider,
      },
      include: {
        attempts: true,
      },
    });

  const row = rows[0];

  const expectedDocumentType =
    invoiceId === creditNote381
      ? "CREDIT_NOTE"
      : "INVOICE";

  const checks = {
    firstNotDuplicate:
      first.duplicate === false,

    secondIsDuplicate:
      second.duplicate === true,

    exactlyOneSubmission:
      rows.length === 1,

    exactlyOneAttempt:
      row?.attempts.length === 1,

    adapterCalledOnce:
      adapterCalls === 1,

    correctFinalStatus:
      row?.status === resultStatus,

    correctAttemptStatus:
      row?.attempts[0]?.status ===
        resultStatus,

    correctDocumentType:
      row?.documentType ===
        expectedDocumentType,

    providerReferenceStored:
      typeof row?.providerReference ===
        "string",

    acceptedTimestampCorrect:
      resultStatus !== "ACCEPTED" ||
      row?.acceptedAt !== null,

    rejectedTimestampCorrect:
      resultStatus !== "REJECTED" ||
      row?.rejectedAt !== null,

    pendingNotCompleted:
      resultStatus !== "PENDING" ||
      row?.completedAt === null,
  };

  console.log(
    `\n===== ${name} =====`
  );

  console.log({
    documentType:
      row?.documentType,
    finalStatus:
      row?.status,
    attemptStatus:
      row?.attempts[0]?.status,
    adapterCalls,
    secondDuplicate:
      second.duplicate,
    acceptedAt:
      row?.acceptedAt,
    rejectedAt:
      row?.rejectedAt,
    completedAt:
      row?.completedAt,
  });

  console.table(
    Object.entries(checks).map(
      ([check, value]) => ({
        check,
        value,
      }),
    ),
  );

  const failed =
    Object.entries(checks)
      .filter(([, value]) => value !== true)
      .map(([key]) => key);

  return {
    name,
    passed: failed.length === 0,
    failed,
  };
}

try {
  const invoiceExists =
    await prisma.invoice.findFirst({
      where: {
        id: invoice380,
        tenantId,
      },
    });

  const creditNoteExists =
    await prisma.invoice.findFirst({
      where: {
        id: creditNote381,
        tenantId,
      },
    });

  if (!invoiceExists) {
    throw new Error(
      "Golden 380 invoice not found. STOP."
    );
  }

  if (!creditNoteExists) {
    throw new Error(
      "Golden 381 credit note not found. STOP."
    );
  }

  const results = [];

  results.push(
    await runScenario({
      name:
        "380 INVOICE - REJECTED",
      invoiceId: invoice380,
      provider:
        "STAGE15_REJECTED_380",
      resultStatus:
        "REJECTED",
    }),
  );

  results.push(
    await runScenario({
      name:
        "380 INVOICE - PENDING",
      invoiceId: invoice380,
      provider:
        "STAGE15_PENDING_380",
      resultStatus:
        "PENDING",
    }),
  );

  results.push(
    await runScenario({
      name:
        "381 CREDIT NOTE - REJECTED",
      invoiceId: creditNote381,
      provider:
        "STAGE15_REJECTED_381",
      resultStatus:
        "REJECTED",
    }),
  );

  results.push(
    await runScenario({
      name:
        "381 CREDIT NOTE - PENDING",
      invoiceId: creditNote381,
      provider:
        "STAGE15_PENDING_381",
      resultStatus:
        "PENDING",
    }),
  );

  console.log(
    "\n===== STAGE 15.4 SUMMARY ====="
  );

  console.table(results);

  const failedScenarios =
    results.filter(
      result => !result.passed
    );

  if (failedScenarios.length > 0) {
    console.log(
      "\nFAILED SCENARIOS:"
    );

    console.log(
      JSON.stringify(
        failedScenarios,
        null,
        2,
      ),
    );

    throw new Error(
      "Stage 15.4 state regression failed. STOP."
    );
  }

  console.log(
    "\nSTAGE_15_4_STATE_REGRESSION_PASSED"
  );

  console.log(
    "380 REJECTED/PENDING = PASS"
  );

  console.log(
    "381 REJECTED/PENDING = PASS"
  );

  console.log(
    "DUPLICATE PROTECTION = PASS"
  );

  console.log(
    "EXTERNAL ASP CALLS = 0"
  );
} finally {
  await prisma.$disconnect();
}
