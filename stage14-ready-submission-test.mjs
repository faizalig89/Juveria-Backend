const BASE = "http://localhost:4000";

const INVOICE_380 =
  "975b7b1e-24d4-4e95-badc-c4acfc011900";

const CREDIT_NOTE_381 =
  "d60f30b6-641c-4565-9520-2640ced4c1b0";

async function main() {
  console.log("\n===== LOGIN =====");

  const loginResponse = await fetch(
    `${BASE}/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "authtest@adescare-demo.com",
        password: "Test@12345",
      }),
    }
  );

  if (!loginResponse.ok) {
    throw new Error(
      `LOGIN FAILED: ${loginResponse.status}`
    );
  }

  const login = await loginResponse.json();

  if (!login.accessToken) {
    throw new Error("LOGIN TOKEN MISSING");
  }

  console.log("LOGIN_OK");

  const token = login.accessToken;

  async function submit(id, expectedType) {
    console.log(
      `\n===== TESTING ${expectedType} =====`
    );

    const response = await fetch(
      `${BASE}/asp/invoice/${id}/submit`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const text = await response.text();

    let body;

    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(
        `NON-JSON RESPONSE: ${text}`
      );
    }

    console.log(
      JSON.stringify(body, null, 2)
    );

    const checks = {
      httpSuccess: response.ok,

      readinessReady:
        body.readinessStatus === "READY",

      correctDocumentType:
        body.documentType === expectedType,

      mockProvider:
        body.provider === "MOCK_ASP",

      submissionProvider:
        body.submission?.provider === "MOCK_ASP",

      accepted:
        body.submission?.status === "ACCEPTED",

      providerReference:
        typeof body.submission?.providerReference ===
          "string" &&
        body.submission.providerReference.startsWith(
          "MOCK-"
        ),
    };

    console.log(
      `\n===== ${expectedType} ASSERTIONS =====`
    );

    console.log(checks);

    if (
      Object.values(checks).some(
        value => value !== true
      )
    ) {
      throw new Error(
        `${expectedType} MOCK ASP REGRESSION FAILED`
      );
    }

    console.log(
      `${expectedType}_MOCK_ASP_REGRESSION_PASSED`
    );
  }

  await submit(
    INVOICE_380,
    "INVOICE"
  );

  await submit(
    CREDIT_NOTE_381,
    "CREDIT_NOTE"
  );

  console.log(
    "\n=========================================="
  );

  console.log(
    "STAGE_14_3A_READY_SUBMISSION_REGRESSION_PASSED"
  );

  console.log(
    "380 READY -> MOCK_ASP = PASS"
  );

  console.log(
    "381 READY -> MOCK_ASP = PASS"
  );

  console.log(
    "REAL ASP CALLS = ZERO"
  );

  console.log(
    "=========================================="
  );
}

main().catch(error => {
  console.error("\nREGRESSION_FAILED");
  console.error(error);
  process.exit(1);
});
