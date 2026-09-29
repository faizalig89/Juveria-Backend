import fs from "fs";
import path from "path";

const schemaPath = "./prisma/schema.prisma";
let schema = fs.readFileSync(schemaPath, "utf8");

/* =========================================================
   SAFETY: current schema must NOT already contain ASP models
   ========================================================= */

if (
  schema.includes("model AspSubmission {") ||
  schema.includes("model AspSubmissionAttempt {")
) {
  throw new Error(
    "ASP models already exist. Refusing duplicate patch."
  );
}

/* =========================================================
   BACKUP CURRENT REAL SCHEMA
   ========================================================= */

fs.copyFileSync(
  schemaPath,
  `${schemaPath}.pre-stage15-restore-backup`
);

/* =========================================================
   TENANT RELATION
   ========================================================= */

const tenantOld = `  invoices  Invoice[]
  users     User[]
}`;

const tenantNew = `  invoices       Invoice[]
  users          User[]
  aspSubmissions AspSubmission[]
}`;

if (!schema.includes(tenantOld)) {
  throw new Error(
    "Expected Tenant relation block not found."
  );
}

schema = schema.replace(
  tenantOld,
  tenantNew
);

/* =========================================================
   INVOICE RELATION
   ========================================================= */

const invoiceOld = `  complianceResults InvoiceComplianceResult[]
  auditEvents       InvoiceAuditEvent[]
}`;

const invoiceNew = `  complianceResults InvoiceComplianceResult[]
  auditEvents       InvoiceAuditEvent[]
  aspSubmissions    AspSubmission[]
}`;

if (!schema.includes(invoiceOld)) {
  throw new Error(
    "Expected Invoice relation block not found."
  );
}

schema = schema.replace(
  invoiceOld,
  invoiceNew
);

/* =========================================================
   ASP MODELS
   ========================================================= */

schema += `

model AspSubmission {
  id                String   @id @default(uuid())
  invoiceId         String
  tenantId          String
  provider          String
  documentType      String
  documentNumber    String
  status            String   @default("CREATED")
  idempotencyKey    String   @unique
  providerReference String?
  attemptCount      Int      @default(0)
  lastError         String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  submittedAt       DateTime?
  acceptedAt        DateTime?
  rejectedAt        DateTime?
  completedAt       DateTime?

  invoice  Invoice                @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  tenant   Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  attempts AspSubmissionAttempt[]

  @@index([invoiceId])
  @@index([tenantId])
  @@index([invoiceId, status])
  @@index([tenantId, status])
  @@index([provider, providerReference])
  @@index([createdAt])
}

model AspSubmissionAttempt {
  id                String   @id @default(uuid())
  submissionId      String
  attemptNumber     Int
  status            String
  providerReference String?
  message           String?
  errorCode         String?
  errorMessage      String?
  startedAt         DateTime @default(now())
  completedAt       DateTime?

  submission AspSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)

  @@unique([submissionId, attemptNumber])
  @@index([submissionId])
  @@index([status])
  @@index([startedAt])
}
`;

fs.writeFileSync(
  schemaPath,
  schema,
  "utf8"
);

/* =========================================================
   CLEAN UP ONLY EMPTY, UNAPPLIED ASP MIGRATIONS
   ========================================================= */

const migrationRoot = "./prisma/migrations";

for (const name of fs.readdirSync(migrationRoot)) {
  if (!name.includes("add_asp_submission_tracking")) {
    continue;
  }

  const dir = path.join(
    migrationRoot,
    name
  );

  const sqlPath = path.join(
    dir,
    "migration.sql"
  );

  if (!fs.existsSync(sqlPath)) {
    throw new Error(
      `ASP migration ${name} has no migration.sql. Refusing deletion.`
    );
  }

  const sql =
    fs.readFileSync(sqlPath, "utf8").trim();

  if (
    sql !== "-- This is an empty migration." &&
    sql.length !== 0
  ) {
    throw new Error(
      `ASP migration ${name} is NOT empty. Refusing deletion.`
    );
  }

  fs.rmSync(
    dir,
    {
      recursive: true,
      force: true,
    }
  );

  console.log(
    `Removed empty migration: ${name}`
  );
}

/* =========================================================
   VERIFY SOURCE FROM DISK
   ========================================================= */

const verify =
  fs.readFileSync(schemaPath, "utf8");

const assertions = {
  aspSubmission:
    verify.includes(
      "model AspSubmission {"
    ),

  aspSubmissionAttempt:
    verify.includes(
      "model AspSubmissionAttempt {"
    ),

  idempotencyUnique:
    verify.includes(
      "idempotencyKey    String   @unique"
    ),

  attemptUnique:
    verify.includes(
      "@@unique([submissionId, attemptNumber])"
    ),

  tenantRelation:
    verify.includes(
      "aspSubmissions AspSubmission[]"
    ),

  invoiceRelation:
    verify.includes(
      "aspSubmissions    AspSubmission[]"
    ),
};

console.log(
  "\n===== RESTORED SCHEMA ASSERTIONS ====="
);

console.log(assertions);

if (
  Object.values(assertions).some(
    value => value !== true
  )
) {
  throw new Error(
    "Restored Stage 15 schema verification failed."
  );
}

console.log(
  "\nSTAGE_15_SCHEMA_RESTORED_AND_VERIFIED"
);
