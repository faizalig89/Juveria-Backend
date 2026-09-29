-- DropForeignKey
ALTER TABLE "InvoiceLine" DROP CONSTRAINT "InvoiceLine_invoiceId_fkey";

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "amountDue" DECIMAL(65,30),
ADD COLUMN     "businessProcessType" TEXT,
ADD COLUMN     "invoiceTypeCode" TEXT,
ADD COLUMN     "jurisdiction" TEXT,
ADD COLUMN     "lineNetTotal" DECIMAL(65,30),
ADD COLUMN     "paymentDueDate" TIMESTAMP(3),
ADD COLUMN     "paymentMeansTypeCode" TEXT,
ADD COLUMN     "specificationIdentifier" TEXT,
ADD COLUMN     "totalTaxAmount" DECIMAL(65,30),
ADD COLUMN     "totalWithTax" DECIMAL(65,30),
ADD COLUMN     "totalWithoutTax" DECIMAL(65,30),
ADD COLUMN     "transactionTypeCode" TEXT;

-- AlterTable
ALTER TABLE "InvoiceLine" ADD COLUMN     "itemGrossPrice" DECIMAL(65,30),
ADD COLUMN     "itemName" TEXT,
ADD COLUMN     "itemNetPrice" DECIMAL(65,30),
ADD COLUMN     "lineAmountAED" DECIMAL(65,30),
ADD COLUMN     "lineIdentifier" TEXT,
ADD COLUMN     "lineNetAmount" DECIMAL(65,30),
ADD COLUMN     "priceBaseQuantity" DECIMAL(65,30),
ADD COLUMN     "taxCategoryCode" TEXT,
ADD COLUMN     "taxRate" DECIMAL(65,30),
ADD COLUMN     "unitOfMeasureCode" TEXT,
ADD COLUMN     "vatLineAmountAED" DECIMAL(65,30);

-- CreateTable
CREATE TABLE "InvoiceParty" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT,
    "electronicAddress" TEXT,
    "electronicIdentifier" TEXT,
    "legalRegistrationIdentifier" TEXT,
    "legalRegistrationIdentifierType" TEXT,
    "taxIdentifier" TEXT,
    "taxSchemeCode" TEXT,
    "addressLine1" TEXT,
    "city" TEXT,
    "countrySubdivision" TEXT,
    "countryCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceTaxBreakdown" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "taxableAmount" DECIMAL(65,30),
    "taxAmount" DECIMAL(65,30),
    "categoryCode" TEXT,
    "taxRate" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceTaxBreakdown_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceParty_invoiceId_idx" ON "InvoiceParty"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceParty_invoiceId_role_idx" ON "InvoiceParty"("invoiceId", "role");

-- CreateIndex
CREATE INDEX "InvoiceTaxBreakdown_invoiceId_idx" ON "InvoiceTaxBreakdown"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceParty" ADD CONSTRAINT "InvoiceParty_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceTaxBreakdown" ADD CONSTRAINT "InvoiceTaxBreakdown_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
