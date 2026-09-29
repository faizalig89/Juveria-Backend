-- AlterTable
ALTER TABLE "InvoiceLine" ADD COLUMN     "vatExemptionReasonCode" TEXT,
ADD COLUMN     "vatExemptionReasonText" TEXT;

-- AlterTable
ALTER TABLE "InvoiceTaxBreakdown" ADD COLUMN     "vatExemptionReasonCode" TEXT,
ADD COLUMN     "vatExemptionReasonText" TEXT;
