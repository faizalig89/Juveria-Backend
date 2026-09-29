import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

try {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'AspSubmission',
        'AspSubmissionAttempt'
      )
    ORDER BY table_name
  `);

  const constraints = await prisma.$queryRawUnsafe(`
    SELECT
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name IN (
        'AspSubmission',
        'AspSubmissionAttempt'
      )
    ORDER BY tc.table_name, tc.constraint_name
  `);

  const migrations = await prisma.$queryRawUnsafe(`
    SELECT
      migration_name,
      finished_at,
      rolled_back_at
    FROM "_prisma_migrations"
    WHERE migration_name LIKE '%asp_submission%'
    ORDER BY started_at
  `);

  console.log("\n===== TABLES =====");
  console.log(tables);

  console.log("\n===== CONSTRAINTS =====");
  console.log(constraints);

  console.log("\n===== MIGRATION HISTORY =====");
  console.log(migrations);

  const names = new Set(
    constraints.map(x => x.constraint_name)
  );

  const checks = {
    aspSubmissionTable:
      tables.some(x =>
        x.table_name === "AspSubmission"
      ),

    aspSubmissionAttemptTable:
      tables.some(x =>
        x.table_name === "AspSubmissionAttempt"
      ),

    idempotencyUnique:
      names.has(
        "AspSubmission_idempotencyKey_key"
      ),

    attemptUnique:
      names.has(
        "AspSubmissionAttempt_submissionId_attemptNumber_key"
      ),

    invoiceForeignKey:
      names.has(
        "AspSubmission_invoiceId_fkey"
      ),

    tenantForeignKey:
      names.has(
        "AspSubmission_tenantId_fkey"
      ),

    attemptForeignKey:
      names.has(
        "AspSubmissionAttempt_submissionId_fkey"
      ),

    migrationRecorded:
      migrations.some(x =>
        x.finished_at !== null &&
        x.rolled_back_at === null
      ),
  };

  console.log("\n===== DATABASE ASSERTIONS =====");
  console.log(checks);

  if (
    Object.values(checks).some(
      value => value !== true
    )
  ) {
    throw new Error(
      "Stage 15.1 database verification failed."
    );
  }

  console.log(
    "\nSTAGE_15_1_DATABASE_VERIFICATION_PASSED"
  );
  console.log(
    "ASP_SUBMISSION_PERSISTENCE = READY"
  );

} finally {
  await prisma.$disconnect();
}
