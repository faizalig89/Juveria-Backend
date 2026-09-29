import fs from "fs";

const file = "./prisma/schema.prisma";

const schema = fs.readFileSync(file, "utf8");

fs.copyFileSync(
  file,
  `${file}.stage14-complete-backup`
);

/*
 * Add relations to Tenant.
 */
const oldTenant = `  invoices  Invoice[]
  users     User[]
}`;

const newTenant = `  invoices       Invoice[]
  users          User[]
  aspSubmissions AspSubmission[]
}`;

if (!schema.includes(oldTenant)) {
  throw new Error(
    "Expected Tenant relation block not found. Schema unchanged."
  );
}

let next = schema.replace(
  oldTenant,
  newTenant
);

/*
 * Add relation to Invoice.
 */
const oldInvoiceRelations = `  complianceResults InvoiceComplianceResult[]
  auditEvents       InvoiceAuditEvent[]
}`;

const newInvoiceRelations = `  complianceResults InvoiceComplianceResult[]
  auditEvents       InvoiceAuditEvent[]
  aspSubmissions    AspSubmission[]
}`;

if (!next.includes(oldInvoiceRelations)) {
  throw new Error(
    "Expected Invoice relation block not found. Schema unchanged."
  );
}

next = next.replace(
  oldInvoiceRelations,
  newInvoiceRelations
);

/*
 * Add persistent ASP submission state and immutable attempts.
 *
 * Important:
 * - providerReference is not globally unique because provider behavior
 *   can differ.
 * - idempotencyKey is unique and controlled by Juveria.
 * - attempt records are append-only by application convention.
 * - UNKNOWN is deliberately available for ambiguous network outcomes.
 */
const models = `

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

next += models;

fs.writeFileSync(
  file,
  next,
  "utf8"
);

/*
 * Re-read from disk and verify the important invariants.
 */
const verify =
  fs.readFileSync(file, "utf8");

const checks = {
  submissionModel:
    verify.includes("model AspSubmission {"),

  attemptModel:
    verify.includes("model AspSubmissionAttempt {"),

  invoiceRelation:
    verify.includes(
      "aspSubmissions    AspSubmission[]"
    ),

  tenantRelation:
    verify.includes(
      "aspSubmissions AspSubmission[]"
    ),

  idempotencyUnique:
    verify.includes(
      "idempotencyKey    String   @unique"
    ),

  attemptUniqueness:
    verify.includes(
      "@@unique([submissionId, attemptNumber])"
    ),

  providerReference:
    verify.includes(
      "providerReference String?"
    ),

  attemptCount:
    verify.includes(
      "attemptCount      Int      @default(0)"
    ),

  errorPersistence:
    verify.includes(
      "lastError         String?"
    ),

  acceptedTimestamp:
    verify.includes(
      "acceptedAt        DateTime?"
    ),

  rejectedTimestamp:
    verify.includes(
      "rejectedAt        DateTime?"
    ),
};

console.log(
  "\n===== STAGE 15.1 SCHEMA ASSERTIONS ====="
);

console.log(checks);

if (
  Object.values(checks).some(
    value => value !== true
  )
) {
  throw new Error(
    "Stage 15.1 schema verification failed."
  );
}

console.log(
  "\nSTAGE_15_1_SCHEMA_SOURCE_VERIFIED"
);
