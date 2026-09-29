import fs from 'node:fs';

const file = './src/prisma/prisma.service.ts';
let source = fs.readFileSync(file, 'utf8');

if (source.includes("from '../config/env.js'")) {
  throw new Error('PrismaService already uses centralized env configuration.');
}

fs.copyFileSync(
  file,
  file + '.stage16-5-backup',
);

const importAnchor =
  "import { PrismaClient } from '@prisma/client';";

if (!source.includes(importAnchor)) {
  throw new Error('Expected PrismaClient import not found.');
}

source = source.replace(
  importAnchor,
  importAnchor +
    "\nimport { env } from '../config/env.js';",
);

const oldConnection =
  'connectionString: process.env.DATABASE_URL,';

if (!source.includes(oldConnection)) {
  throw new Error('Expected DATABASE_URL usage not found.');
}

source = source.replace(
  oldConnection,
  'connectionString: env.databaseUrl,',
);

fs.writeFileSync(file, source, 'utf8');

const verify = fs.readFileSync(file, 'utf8');

if (!verify.includes('connectionString: env.databaseUrl,')) {
  throw new Error('Centralized database configuration was not installed.');
}

if (verify.includes('process.env.DATABASE_URL')) {
  throw new Error('Direct DATABASE_URL access still exists in PrismaService.');
}

console.log('STAGE_16_5_DB_CONFIG_PATCHED');
console.log('PRISMA_USES_VALIDATED_DATABASE_URL');
console.log('DIRECT_DATABASE_ENV_ACCESS_REMOVED');
