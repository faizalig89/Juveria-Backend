const BASE = "http://localhost:4000";
const CREDIT_NOTE =
  "d60f30b6-641c-4565-9520-2640ced4c1b0";

async function main() {
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

  const response = await fetch(
    `${BASE}/compliance/invoice/${CREDIT_NOTE}/readiness`,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${login.accessToken}`,
      },
    }
  );

  const body = await response.json();

  console.log("\n===== 381 READINESS =====");
  console.log(
    JSON.stringify(body, null, 2)
  );

  const resultsResponse = await fetch(
    `${BASE}/compliance/invoice/${CREDIT_NOTE}/results/uae`,
    {
      headers: {
        Authorization:
          `Bearer ${login.accessToken}`,
      },
    }
  );

  const results = await resultsResponse.json();

  const rows =
    Array.isArray(results)
      ? results
      : results.results ?? [];

  const failed = rows.filter(
    r =>
      r.status === "FAIL" ||
      r.result === "FAIL" ||
      r.passed === false
  );

  console.log(
    "\n===== 381 FAILED INTERNAL RULES ====="
  );

  console.log(
    JSON.stringify(failed, null, 2)
  );

  console.log(
    `\nFAILED_RULE_COUNT=${failed.length}`
  );

  if (
    body?.official?.passed !== true
  ) {
    throw new Error(
      "381 official validation unexpectedly failed"
    );
  }

  console.log(
    "381_OFFICIAL_STILL_PASSED"
  );

  if (failed.length === 0) {
    throw new Error(
      "Readiness says internal failure but no failed persisted UAE rules were found"
    );
  }

  console.log(
    "381_INTERNAL_FAILURE_IDENTIFIED"
  );
}

main().catch(error => {
  console.error("\nDIAGNOSTIC_FAILED");
  console.error(error);
  process.exit(1);
});
