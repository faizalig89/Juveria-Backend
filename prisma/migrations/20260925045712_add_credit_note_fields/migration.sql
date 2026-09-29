-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "creditNoteReasonCode" TEXT,
ADD COLUMN     "creditNoteReasonText" TEXT,
ADD COLUMN     "precedingInvoiceReference" TEXT;
