require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
});

const prisma = new PrismaClient({ adapter });

const INVOICE_ID = "975b7b1e-24d4-4e95-badc-c4acfc011900";

async function main() {

  const result = await prisma.invoiceParty.updateMany({
    where: {
      invoiceId: INVOICE_ID,
      role: { in: ["SELLER", "BUYER"] }
    },
    data: {
      legalRegistrationIdentifierType: "Commercial/Trade license"
    }
  });

  const parties = await prisma.invoiceParty.findMany({
    where: { invoiceId: INVOICE_ID },
    orderBy: { role: "asc" }
  });

  console.log("Updated parties:", result.count);

  for (const p of parties) {
    console.log(
      p.role,
      "| Legal ID:", p.legalRegistrationIdentifier,
      "| Type:", p.legalRegistrationIdentifierType
    );
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
