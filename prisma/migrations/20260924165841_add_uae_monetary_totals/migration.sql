-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "allowanceTotal" DECIMAL(65,30),
ADD COLUMN     "chargeTotal" DECIMAL(65,30),
ADD COLUMN     "paidAmount" DECIMAL(65,30),
ADD COLUMN     "roundingAmount" DECIMAL(65,30);
