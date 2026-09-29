import 'dotenv/config';
import { PrismaService } from './dist/prisma/prisma.service.js';

const prisma = new PrismaService();

let connected = false;
let queryPassed = false;
let disconnected = false;

try {
  await prisma.onModuleInit();
  connected = true;

  const result = await prisma.$queryRaw`SELECT 1 AS value`;
  queryPassed =
    Array.isArray(result) &&
    result.length === 1;

  if (!queryPassed) {
    throw new Error('DATABASE PROBE FAILED');
  }
} finally {
  await prisma.onModuleDestroy();
  disconnected = true;
}

console.log({
  connected,
  queryPassed,
  disconnected,
});

if (!connected)
  throw new Error('PRISMA CONNECT FAILED');

if (!queryPassed)
  throw new Error('DATABASE QUERY FAILED');

if (!disconnected)
  throw new Error('PRISMA DISCONNECT FAILED');

console.log('STAGE_16_5_PRISMA_LIFECYCLE_PASSED');
console.log('PRISMA_CONNECT = PASS');
console.log('DATABASE_QUERY = PASS');
console.log('PRISMA_DISCONNECT = PASS');
