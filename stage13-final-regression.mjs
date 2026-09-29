const BASE = "http://localhost:4000";

const INVOICE_380 =
  "975b7b1e-24d4-4e95-badc-c4acfc011900";

const CREDIT_NOTE_381 =
  "d60f30b6-641c-4565-9520-2640ced4c1b0";

async function getJson(url, options = {}) {
  const response = await fetch(url, options);

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText}\n${text}`
    );
  }

  return text ? JSON.parse(text) : {};
}

console.log("\n===== LOGIN =====");

const login = await getJson(`${BASE}/auth/login`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "authtest@adescare-demo.com",
    password: "Test@12345",
  }),
});

const token = login.accessToken;

if (!token) {
  throw new Error("Login succeeded but accessToken missing");
}

const headers = {
  Authorization: `Bearer ${token}`,
};

console.log("LOGIN_OK");


console.log("\n==========================================");
console.log("380 INVOICE FINAL REGRESSION");
console.log("==========================================");

const readiness380 = await getJson(
  `${BASE}/compliance/invoice/${INVOICE_380}/readiness`,
  {
    method: "POST",
    headers,
  }
);

console.log(JSON.stringify(readiness380, null, 2));

const checks380 = {
  ready:
    readiness380.readinessStatus === "READY",

  internalPassed:
    readiness380.internal?.passed === true,

  internal77:
    readiness380.internal?.totalRules === 77,

  internalFailed0:
    readiness380.internal?.failedRules === 0,

  internalSkipped0:
    readiness380.internal?.skippedRules === 0,

  officialPassed:
    readiness380.official?.passed === true,

  shared0:
    readiness380.official?.shared?.failureCount === 0,

  uae0:
    readiness380.official?.uae?.failureCount === 0,

  totalFailures0:
    readiness380.official?.totalFailures === 0,
};

console.log("\n380 ASSERTIONS:");
console.log(checks380);

if (Object.values(checks380).some(v => v !== true)) {
  throw new Error("380 FINAL REGRESSION FAILED");
}

console.log("\n380_FINAL_REGRESSION_PASSED");


console.log("\n==========================================");
console.log("381 AC CREDIT NOTE FINAL REGRESSION");
console.log("==========================================");

const ublResponse = await fetch(
  `${BASE}/compliance/invoice/${CREDIT_NOTE_381}/ubl`,
  {
    headers,
  }
);

if (!ublResponse.ok) {
  throw new Error(
    `381 UBL HTTP ${ublResponse.status}: ` +
    await ublResponse.text()
  );
}

const xml381 = await ublResponse.text();

const ublChecks381 = {
  creditNoteRoot:
    xml381.includes("<CreditNote"),

  type381:
    xml381.includes(
      "<cbc:CreditNoteTypeCode>381</cbc:CreditNoteTypeCode>"
    ),

  validReasonCode:
    xml381.includes(
      "<cbc:ResponseCode>DL8.61.1.A</cbc:ResponseCode>"
    ),

  billingReference:
    xml381.includes("<cac:BillingReference>") &&
    xml381.includes(
      "<cbc:ID>UAE-TEST-20260924-163926</cbc:ID>"
    ),

  creditNoteLine:
    xml381.includes("<cac:CreditNoteLine>"),

  noInvoiceLine:
    !xml381.includes("<cac:InvoiceLine>"),

  priceAllowanceCharge:
    xml381.includes("<cac:Price>") &&
    xml381.includes("<cac:AllowanceCharge>"),

  priceBaseAmount:
    xml381.includes("<cbc:BaseAmount"),
};

console.log("\n381 UBL ASSERTIONS:");
console.log(ublChecks381);

if (Object.values(ublChecks381).some(v => v !== true)) {
  throw new Error("381 AC UBL REGRESSION FAILED");
}

console.log("\n381_AC_UBL_REGRESSION_PASSED");


const official381 = await getJson(
  `${BASE}/compliance/invoice/${CREDIT_NOTE_381}/pint-ae-validation`,
  {
    headers,
  }
);

console.log("\n381 OFFICIAL RESULT:");
console.log(JSON.stringify(official381, null, 2));

const officialChecks381 = {
  shared0:
    official381.shared?.failureCount === 0,

  sharedPassed:
    official381.shared?.passed === true,

  uae0:
    official381.uae?.failureCount === 0,

  uaePassed:
    official381.uae?.passed === true,

  totalFailures0:
    official381.totalFailures === 0,

  passed:
    official381.passed === true,
};

console.log("\n381 OFFICIAL ASSERTIONS:");
console.log(officialChecks381);

if (
  Object.values(officialChecks381)
    .some(v => v !== true)
) {
  throw new Error(
    "381 AC OFFICIAL REGRESSION FAILED"
  );
}

console.log("\n381_AC_OFFICIAL_REGRESSION_PASSED");


console.log("\n==========================================");
console.log("STAGE_13_FINAL_REGRESSION_PASSED");
console.log("380 INVOICE = PASS");
console.log("381 AC CREDIT NOTE = PASS");
console.log("381 VD CREDIT NOTE = PREVIOUSLY PROVEN PASS");
console.log("==========================================");
