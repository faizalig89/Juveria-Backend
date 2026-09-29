import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is missing');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const invoiceId = '975b7b1e-24d4-4e95-badc-c4acfc011900';

async function main() {
  const before = await prisma.invoiceParty.findMany({
    where: {
      invoiceId,
      role: {
        in: ['SELLER', 'BUYER'],
      },
    },
    select: {
      id: true,
      role: true,
      name: true,
      legalRegistrationIdentifier: true,
      legalRegistrationIdentifierType: true,
      legalRegistrationAuthorityName: true,
    },
  });

  console.log('\n===== BEFORE =====');
  console.log(JSON.stringify(before, null, 2));

  if (before.length !== 2) {
    throw new Error(
      `Expected exactly 2 SELLER/BUYER parties but found ${before.length}`,
    );
  }

  for (const party of before) {
    if (party.legalRegistrationIdentifierType !== 'TL') {
      throw new Error(
        `${party.role} expected legal registration type TL but found ${party.legalRegistrationIdentifierType}`,
      );
    }
  }

  const update = await prisma.invoiceParty.updateMany({
    where: {
      invoiceId,
      role: {
        in: ['SELLER', 'BUYER'],
      },
      legalRegistrationIdentifierType: 'TL',
    },
    data: {
      legalRegistrationAuthorityName: 'TEST-LICENSING-AUTHORITY',
    },
  });

  if (update.count !== 2) {
    throw new Error(
      `Expected to update 2 parties but updated ${update.count}`,
    );
  }

  const after = await prisma.invoiceParty.findMany({
    where: {
      invoiceId,
      role: {
        in: ['SELLER', 'BUYER'],
      },
    },
    select: {
      id: true,
      role: true,
      name: true,
      legalRegistrationIdentifier: true,
      legalRegistrationIdentifierType: true,
      legalRegistrationAuthorityName: true,
    },
    orderBy: {
      role: 'asc',
    },
  });

  console.log('\n===== AFTER =====');
  console.log(JSON.stringify(after, null, 2));

  for (const party of after) {
    if (
      party.legalRegistrationAuthorityName !==
      'TEST-LICENSING-AUTHORITY'
    ) {
      throw new Error(`${party.role} authority update failed`);
    }
  }

  console.log('\nFIXTURE AUTHORITY DATA CONFIRMED.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
