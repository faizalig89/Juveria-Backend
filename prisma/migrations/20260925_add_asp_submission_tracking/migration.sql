-- CreateTable
CREATE TABLE "AspSubmission" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "idempotencyKey" TEXT NOT NULL,
    "providerReference" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AspSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AspSubmissionAttempt" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "providerReference" TEXT,
    "message" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AspSubmissionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AspSubmission_idempotencyKey_key" ON "AspSubmission"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AspSubmission_invoiceId_idx" ON "AspSubmission"("invoiceId");

-- CreateIndex
CREATE INDEX "AspSubmission_tenantId_idx" ON "AspSubmission"("tenantId");

-- CreateIndex
CREATE INDEX "AspSubmission_invoiceId_status_idx" ON "AspSubmission"("invoiceId", "status");

-- CreateIndex
CREATE INDEX "AspSubmission_tenantId_status_idx" ON "AspSubmission"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AspSubmission_provider_providerReference_idx" ON "AspSubmission"("provider", "providerReference");

-- CreateIndex
CREATE INDEX "AspSubmission_createdAt_idx" ON "AspSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "AspSubmissionAttempt_submissionId_idx" ON "AspSubmissionAttempt"("submissionId");

-- CreateIndex
CREATE INDEX "AspSubmissionAttempt_status_idx" ON "AspSubmissionAttempt"("status");

-- CreateIndex
CREATE INDEX "AspSubmissionAttempt_startedAt_idx" ON "AspSubmissionAttempt"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AspSubmissionAttempt_submissionId_attemptNumber_key" ON "AspSubmissionAttempt"("submissionId", "attemptNumber");

-- AddForeignKey
ALTER TABLE "AspSubmission" ADD CONSTRAINT "AspSubmission_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AspSubmission" ADD CONSTRAINT "AspSubmission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AspSubmissionAttempt" ADD CONSTRAINT "AspSubmissionAttempt_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AspSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
