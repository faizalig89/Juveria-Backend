-- CreateTable
CREATE TABLE "InvoiceAllowanceCharge" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "reasonCode" TEXT,
    "reasonText" TEXT,
    "baseAmount" DECIMAL(65,30),
    "percentage" DECIMAL(65,30),
    "taxCategoryCode" TEXT,
    "taxRate" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceAllowanceCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceAllowanceCharge_invoiceId_idx" ON "InvoiceAllowanceCharge"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceAllowanceCharge_invoiceId_type_idx" ON "InvoiceAllowanceCharge"("invoiceId", "type");

-- AddForeignKey
ALTER TABLE "InvoiceAllowanceCharge" ADD CONSTRAINT "InvoiceAllowanceCharge_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
