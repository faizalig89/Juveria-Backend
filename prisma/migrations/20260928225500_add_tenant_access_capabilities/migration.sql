-- Juveria Phase 3A: tenant lifecycle and ERP capability foundation.
-- Existing tenants remain PAID_ACTIVE to preserve certified access semantics.
ALTER TABLE "Tenant"
ADD COLUMN "accessStatus" TEXT NOT NULL DEFAULT 'PAID_ACTIVE',
ADD COLUMN "trialStartedAt" TIMESTAMP(3),
ADD COLUMN "trialExpiresAt" TIMESTAMP(3),
ADD COLUMN "erpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "productionEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Preserve ERP access for any tenant that already has an integration connection.
UPDATE "Tenant" AS tenant
SET "erpEnabled" = true
WHERE EXISTS (
  SELECT 1
  FROM "IntegrationConnection" AS connection
  WHERE connection."tenantId" = tenant."id"
);

CREATE INDEX "Tenant_accessStatus_trialExpiresAt_idx"
ON "Tenant"("accessStatus", "trialExpiresAt");
