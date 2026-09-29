ALTER TABLE "IntegrationSyncRun"
ADD COLUMN "pushedCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ExternalInvoiceLink"
ADD COLUMN "lastPushedStatus" TEXT,
ADD COLUMN "lastPushedSubmissionId" TEXT,
ADD COLUMN "lastPushedProviderReference" TEXT,
ADD COLUMN "writebackKey" TEXT,
ADD COLUMN "writebackState" TEXT,
ADD COLUMN "writebackClaimedAt" TIMESTAMP(3),
ADD COLUMN "writebackLastError" TEXT;

CREATE INDEX "ExternalInvoiceLink_tenantId_lastPushedStatus_idx"
ON "ExternalInvoiceLink"("tenantId", "lastPushedStatus");

CREATE INDEX "ExternalInvoiceLink_tenantId_writebackState_idx"
ON "ExternalInvoiceLink"("tenantId", "writebackState");
