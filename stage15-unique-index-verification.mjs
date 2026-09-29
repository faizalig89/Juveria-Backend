import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

try {
  const indexes = await prisma.$queryRawUnsafe(`
    SELECT
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN (
        'AspSubmission',
        'AspSubmissionAttempt'
      )
    ORDER BY tablename, indexname
  `);

  console.log("\n===== POSTGRESQL INDEXES =====");
  console.table(indexes);

  const idempotency =
    indexes.find(
      x =>
        x.indexname ===
        "AspSubmission_idempotencyKey_key"
    );

  const attemptUnique =
    indexes.find(
      x =>
        x.indexname ===
        "AspSubmissionAttempt_submissionId_attemptNumber_key"
    );

  const checks = {
    idempotencyUniqueIndexExists:
      !!idempotency,

    idempotencyIndexIsUnique:
      !!idempotency &&
      /\bCREATE UNIQUE INDEX\b/i.test(
        idempotency.indexdef
      ),

    attemptUniqueIndexExists:
      !!attemptUnique,

    attemptIndexIsUnique:
      !!attemptUnique &&
      /\bCREATE UNIQUE INDEX\b/i.test(
        attemptUnique.indexdef
      ),
  };

  console.log("\n===== UNIQUE INDEX ASSERTIONS =====");
  console.table(
    Object.entries(checks).map(
      ([name, value]) => ({
        name,
        value,
      })
    )
  );

  const failed =
    Object.entries(checks)
      .filter(([, value]) => value !== true)
      .map(([name]) => name);

  if (failed.length > 0) {
    console.log("\nFAILED:");
    console.log(failed);

    throw new Error(
      "Required unique indexes are not fully verified."
    );
  }

  console.log(
    "\nSTAGE_15_1_UNIQUE_INDEX_VERIFICATION_PASSED"
  );

} finally {
  await prisma.$disconnect();
}
