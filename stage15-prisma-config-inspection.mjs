import fs from "fs";

console.log("\n===== PRISMA CONFIG =====");
console.log(
  fs.readFileSync("./prisma.config.ts", "utf8")
);

console.log("\n===== SCHEMA HEADER + ASP MODELS PRESENT =====");

const schema =
  fs.readFileSync("./prisma/schema.prisma", "utf8");

console.log({
  schemaLength: schema.length,
  hasAspSubmission:
    schema.includes("model AspSubmission {"),
  hasAspSubmissionAttempt:
    schema.includes("model AspSubmissionAttempt {"),
  hasInvoiceAspRelation:
    schema.includes("aspSubmissions"),
});

console.log("\n===== DATABASE_URL SAFE DIAGNOSTIC =====");

const env =
  fs.readFileSync("./.env", "utf8");

const line =
  env
    .split(/\r?\n/)
    .find(x =>
      x.trim().startsWith("DATABASE_URL=")
    );

if (!line) {
  console.log({
    databaseUrlPresent: false
  });
} else {
  const raw =
    line.substring(
      line.indexOf("=") + 1
    ).trim();

  let safe = raw;

  try {
    const u = new URL(
      raw.replace(/^["']|["']$/g, "")
    );

    safe =
      `${u.protocol}//` +
      `${u.hostname}` +
      `${u.port ? ":" + u.port : ""}` +
      `${u.pathname}`;
  } catch {
    safe = "PRESENT_BUT_NOT_PARSED";
  }

  console.log({
    databaseUrlPresent: true,
    safeDatabaseTarget: safe,
  });
}

console.log(
  "\nSTAGE_15_PRISMA_CONFIG_INSPECTION_COMPLETE"
);
