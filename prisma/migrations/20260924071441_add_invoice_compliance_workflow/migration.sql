-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "complianceStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "InvoiceComplianceResult" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT,
    "field" TEXT,
    "actualValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceComplianceResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceAuditEvent" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceComplianceResult_invoiceId_idx" ON "InvoiceComplianceResult"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceComplianceResult_tenantId_idx" ON "InvoiceComplianceResult"("tenantId");

-- CreateIndex
CREATE INDEX "InvoiceComplianceResult_invoiceId_status_idx" ON "InvoiceComplianceResult"("invoiceId", "status");

-- CreateIndex
CREATE INDEX "InvoiceAuditEvent_invoiceId_idx" ON "InvoiceAuditEvent"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceAuditEvent_tenantId_idx" ON "InvoiceAuditEvent"("tenantId");

-- CreateIndex
CREATE INDEX "InvoiceAuditEvent_createdAt_idx" ON "InvoiceAuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "InvoiceComplianceResult" ADD CONSTRAINT "InvoiceComplianceResult_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceAuditEvent" ADD CONSTRAINT "InvoiceAuditEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
