import fs from 'node:fs';

const file = './src/storage/service.ts';

const source = fs.readFileSync(file, 'utf8');

if (!source.includes("'uploads',")) {
  throw new Error(
    'STOP: expected uploads directory definition not found.',
  );
}

if (source.includes('STORAGE_ROOT')) {
  throw new Error(
    'STOP: STORAGE_ROOT already appears in service.ts.',
  );
}

const oldBlock = `  private readonly uploadDirectory = join(
    process.cwd(),
    'uploads',
  );`;

const newBlock = `  private readonly uploadDirectory =
    process.env.STORAGE_ROOT
      ? resolve(process.env.STORAGE_ROOT)
      : join(
          process.cwd(),
          'uploads',
        );`;

if (!source.includes(oldBlock)) {
  throw new Error(
    'STOP: exact storage directory block not found.',
  );
}

const updated = source.replace(
  oldBlock,
  newBlock,
);

fs.writeFileSync(
  file,
  updated,
  'utf8',
);

const verify = fs.readFileSync(file, 'utf8');

const checks = {
  storageRootSupported:
    verify.includes('process.env.STORAGE_ROOT'),

  productionPathResolved:
    verify.includes(
      'resolve(process.env.STORAGE_ROOT)',
    ),

  localFallbackPreserved:
    verify.includes("process.cwd(),") &&
    verify.includes("'uploads',"),

  traversalProtectionPreserved:
    verify.includes(
      'requestedPath.startsWith(',
    ),

  legacyCompatibilityPreserved:
    verify.includes('basename(storageKey)'),

  streamingPreserved:
    verify.includes('createReadStream(filePath)'),
};

let failed = false;

for (const [name, passed] of Object.entries(checks)) {
  console.log(`${name}: ${passed}`);

  if (!passed) {
    failed = true;
  }
}

if (failed) {
  throw new Error(
    'STORAGE PATCH VERIFICATION FAILED',
  );
}

console.log('');
console.log('STAGE_16_7_STORAGE_PATCH = PASS');
console.log('CONFIGURABLE_STORAGE_ROOT = PASS');
console.log('LOCAL_DEVELOPMENT_FALLBACK = PASS');
console.log('PATH_TRAVERSAL_PROTECTION = PASS');
console.log('LEGACY_STORAGE_COMPATIBILITY = PASS');
