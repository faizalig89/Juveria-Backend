import { AspService } from "./dist/asp/asp.service.js";

let adapterSubmitCalls = 0;
let ublGenerateCalls = 0;
let readinessCalls = 0;
let invoiceLookupCalls = 0;

const prisma = {
  invoice: {
    findFirst: async () => {
      invoiceLookupCalls++;

      return {
        id: "SAFETY-TEST-INVOICE",
        invoiceNumber: "SAFETY-TEST-001",
        invoiceTypeCode: "380",
      };
    },
  },
};

const readinessService = {
  evaluate: async () => {
    readinessCalls++;

    return {
      readinessStatus: "NOT_READY",
      internal: {
        passed: false,
      },
      official: {
        passed: true,
      },
    };
  },
};

const ublService = {
  generate: async () => {
    ublGenerateCalls++;
    return "<Invoice/>";
  },
};

const adapter = {
  providerName: "SAFETY_TEST_ASP",

  submit: async () => {
    adapterSubmitCalls++;

    return {
      provider: "SAFETY_TEST_ASP",
      status: "ACCEPTED",
      submittedAt: new Date().toISOString(),
    };
  },
};

const service = new AspService(
  prisma,
  readinessService,
  ublService,
  adapter,
);

let blocked = false;
let errorMessage = "";

try {
  await service.submit(
    "SAFETY-TEST-INVOICE",
    "SAFETY-TEST-TENANT",
    "SAFETY-TEST-USER",
  );
} catch (error) {
  blocked = true;

  if (
    error &&
    typeof error === "object" &&
    typeof error.getResponse === "function"
  ) {
    const response = error.getResponse();

    errorMessage =
      typeof response === "string"
        ? response
        : response?.message ?? "";
  } else {
    errorMessage =
      error instanceof Error
        ? error.message
        : String(error);
  }
}

const assertions = {
  invoiceLookupExactlyOnce:
    invoiceLookupCalls === 1,

  readinessCheckedExactlyOnce:
    readinessCalls === 1,

  requestBlocked:
    blocked === true,

  correctBlockReason:
    String(errorMessage).includes(
      "not READY"
    ),

  submissionUblNotGenerated:
    ublGenerateCalls === 0,

  adapterNeverCalled:
    adapterSubmitCalls === 0,
};

console.log(
  "\n===== STAGE 14.3B FAIL-CLOSED ASSERTIONS ====="
);

console.log({
  invoiceLookupCalls,
  readinessCalls,
  ublGenerateCalls,
  adapterSubmitCalls,
  errorMessage,
});

console.log("\nASSERTIONS:");
console.log(assertions);

if (
  Object.values(assertions).some(
    value => value !== true
  )
) {
  console.error(
    "\nSTAGE_14_3B_FAIL_CLOSED_REGRESSION_FAILED"
  );

  process.exit(1);
}

console.log(
  "\nSTAGE_14_3B_FAIL_CLOSED_REGRESSION_PASSED"
);

console.log(
  "NOT_READY -> BLOCKED = PASS"
);

console.log(
  "POST-READINESS UBL GENERATION CALLS = 0"
);

console.log(
  "ASP ADAPTER SUBMIT CALLS = 0"
);

console.log(
  "EXTERNAL ASP CALLS = 0"
);
