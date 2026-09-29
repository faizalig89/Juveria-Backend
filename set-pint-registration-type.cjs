require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL
  })
});

const INVOICE_ID = "975b7b1e-24d4-4e95-badc-c4acfc011900";

async function main() {

  await prisma.invoiceParty.updateMany({
    where: {
      invoiceId: INVOICE_ID,
      role: { in: ["SELLER", "BUYER"] }
    },
    data: {
      legalRegistrationIdentifierType: "TL"
    }
  });

  const parties = await prisma.invoiceParty.findMany({
    where: { invoiceId: INVOICE_ID },
    orderBy: { role: "asc" }
  });

  for (const p of parties) {
    console.log(
      p.role,
      "| Legal ID:", p.legalRegistrationIdentifier,
      "| Registration type:", p.legalRegistrationIdentifierType
    );
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
