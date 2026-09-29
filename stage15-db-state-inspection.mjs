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

  const migrations = await prisma.$queryRawUnsafe(`
    SELECT migration_name, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    WHERE migration_name LIKE '%asp_submission%'
    ORDER BY started_at
  `);

  console.log("\n===== DATABASE ASP TABLES =====");
  console.log(tables);

  console.log("\n===== DATABASE ASP MIGRATION HISTORY =====");
  console.log(migrations);

  console.log("\n===== ASSERTIONS =====");
  console.log({
    aspTableCount: tables.length,
    migrationHistoryCount: migrations.length,
  });

  console.log("\nSTAGE_15_DATABASE_STATE_INSPECTED");
} finally {
  await prisma.$disconnect();
}
