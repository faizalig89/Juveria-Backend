import fs from 'node:fs';

const file = './src/prisma/prisma.module.ts';

if (fs.existsSync(file)) {
  throw new Error(
    'STOP: prisma.module.ts already exists. No file changed.',
  );
}

const source = [
  "import { Global, Module } from '@nestjs/common';",
  "import { PrismaService } from './prisma.service.js';",
  "",
  "@Global()",
  "@Module({",
  "  providers: [PrismaService],",
  "  exports: [PrismaService],",
  "})",
  "export class PrismaModule {}",
  "",
].join('\n');

fs.writeFileSync(file, source, 'utf8');

const verify = fs.readFileSync(file, 'utf8');

const checks = {
  globalModule:
    verify.includes('@Global()'),

  prismaProvider:
    verify.includes('providers: [PrismaService]'),

  prismaExport:
    verify.includes('exports: [PrismaService]'),

  moduleExport:
    verify.includes('export class PrismaModule'),
};

for (const [name, passed] of Object.entries(checks)) {
  console.log(name + ': ' + passed);

  if (!passed) {
    fs.rmSync(file, { force: true });

    throw new Error(
      'VERIFY FAILED: ' + name +
      '. New module removed.',
    );
  }
}

console.log('STAGE_16_6C_PRISMA_MODULE_CREATED = PASS');
console.log('GLOBAL_PRISMA_PROVIDER = PASS');
console.log('PRISMA_EXPORT = PASS');
