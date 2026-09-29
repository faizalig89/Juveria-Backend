-- Juveria ERP Integration Hub V1
-- Additive-only: existing certified tables are not removed or altered destructively.

CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "authType" TEXT NOT NULL,
    "config" JSONB,
    "credentialsEncrypted" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestSucceeded" BOOLEAN,
    "lastError" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationSyncRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cursor" TEXT,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,
    CONSTRAINT "IntegrationSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalInvoiceLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "externalInvoiceId" TEXT NOT NULL,
    "externalInvoiceNumber" TEXT,
    "externalStatus" TEXT,
    "externalVersion" TEXT,
    "lastPulledAt" TIMESTAMP(3),
    "lastPushedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExternalInvoiceLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationConnection_tenantId_provider_name_key"
ON "IntegrationConnection"("tenantId", "provider", "name");
CREATE INDEX "IntegrationConnection_tenantId_idx"
ON "IntegrationConnection"("tenantId");
CREATE INDEX "IntegrationConnection_tenantId_provider_idx"
ON "IntegrationConnection"("tenantId", "provider");
CREATE INDEX "IntegrationConnection_tenantId_isActive_idx"
ON "IntegrationConnection"("tenantId", "isActive");

CREATE INDEX "IntegrationSyncRun_tenantId_startedAt_idx"
ON "IntegrationSyncRun"("tenantId", "startedAt");
CREATE INDEX "IntegrationSyncRun_connectionId_startedAt_idx"
ON "IntegrationSyncRun"("connectionId", "startedAt");
CREATE INDEX "IntegrationSyncRun_tenantId_status_idx"
ON "IntegrationSyncRun"("tenantId", "status");

CREATE UNIQUE INDEX "ExternalInvoiceLink_connectionId_externalInvoiceId_key"
ON "ExternalInvoiceLink"("connectionId", "externalInvoiceId");
CREATE UNIQUE INDEX "ExternalInvoiceLink_connectionId_invoiceId_key"
ON "ExternalInvoiceLink"("connectionId", "invoiceId");
CREATE INDEX "ExternalInvoiceLink_tenantId_idx"
ON "ExternalInvoiceLink"("tenantId");
CREATE INDEX "ExternalInvoiceLink_invoiceId_idx"
ON "ExternalInvoiceLink"("invoiceId");
CREATE INDEX "ExternalInvoiceLink_tenantId_externalStatus_idx"
ON "ExternalInvoiceLink"("tenantId", "externalStatus");

ALTER TABLE "IntegrationConnection"
ADD CONSTRAINT "IntegrationConnection_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntegrationSyncRun"
ADD CONSTRAINT "IntegrationSyncRun_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntegrationSyncRun"
ADD CONSTRAINT "IntegrationSyncRun_connectionId_fkey"
FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExternalInvoiceLink"
ADD CONSTRAINT "ExternalInvoiceLink_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExternalInvoiceLink"
ADD CONSTRAINT "ExternalInvoiceLink_connectionId_fkey"
FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExternalInvoiceLink"
ADD CONSTRAINT "ExternalInvoiceLink_invoiceId_fkey"
FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
