-- DropIndex
DROP INDEX "InvoiceComplianceResult_invoiceId_status_idx";

-- AlterTable
ALTER TABLE "InvoiceComplianceResult" ADD COLUMN     "rulePack" TEXT NOT NULL DEFAULT 'GENERIC';

-- CreateIndex
CREATE INDEX "InvoiceComplianceResult_invoiceId_rulePack_idx" ON "InvoiceComplianceResult"("invoiceId", "rulePack");

-- CreateIndex
CREATE INDEX "InvoiceComplianceResult_invoiceId_rulePack_status_idx" ON "InvoiceComplianceResult"("invoiceId", "rulePack", "status");
