import fs from 'node:fs';

const envFile = './src/config/env.ts';
const storageFile = './src/storage/service.ts';

let envSource =
  fs.readFileSync(envFile, 'utf8');

let storageSource =
  fs.readFileSync(storageFile, 'utf8');

const envNeedle = `  corsOrigins:
    parseCorsOrigins(
      process.env.CORS_ORIGINS,
    ),
});`;

const envReplacement = `  corsOrigins:
    parseCorsOrigins(
      process.env.CORS_ORIGINS,
    ),
  storageRoot:
    process.env.STORAGE_ROOT?.trim() ||
    undefined,
});`;

if (!envSource.includes(envNeedle)) {
  throw new Error(
    'STOP: env.ts expected block not found.',
  );
}

envSource = envSource.replace(
  envNeedle,
  envReplacement,
);

const importNeedle =
  `import {\n  basename,\n  join,\n  resolve,\n} from 'path';`;

const importReplacement =
  `import {\n  basename,\n  join,\n  resolve,\n} from 'path';\nimport { env } from '../config/env.js';`;

if (!storageSource.includes(importNeedle)) {
  throw new Error(
    'STOP: storage path import block not found.',
  );
}

storageSource = storageSource.replace(
  importNeedle,
  importReplacement,
);

const storageNeedle = `  private readonly uploadDirectory =
    process.env.STORAGE_ROOT
      ? resolve(process.env.STORAGE_ROOT)
      : join(
          process.cwd(),
          'uploads',
        );`;

const storageReplacement = `  private readonly uploadDirectory =
    env.storageRoot
      ? resolve(env.storageRoot)
      : join(
          process.cwd(),
          'uploads',
        );`;

if (!storageSource.includes(storageNeedle)) {
  throw new Error(
    'STOP: STORAGE_ROOT block not found.',
  );
}

storageSource = storageSource.replace(
  storageNeedle,
  storageReplacement,
);

fs.writeFileSync(
  envFile,
  envSource,
  'utf8',
);

fs.writeFileSync(
  storageFile,
  storageSource,
  'utf8',
);

const finalEnv =
  fs.readFileSync(envFile, 'utf8');

const finalStorage =
  fs.readFileSync(storageFile, 'utf8');

const checks = {
  envExposesStorageRoot:
    finalEnv.includes('storageRoot:'),

  envReadsStorageRoot:
    finalEnv.includes(
      'process.env.STORAGE_ROOT?.trim()',
    ),

  storageUsesCentralEnv:
    finalStorage.includes('env.storageRoot'),

  storageImportsEnv:
    finalStorage.includes(
      "from '../config/env.js'",
    ),

  storageNoDirectEnvRead:
    !finalStorage.includes(
      'process.env.STORAGE_ROOT',
    ),

  localFallbackPreserved:
    finalStorage.includes("process.cwd(),") &&
    finalStorage.includes("'uploads',"),
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
    'STAGE 16.8A SOURCE VERIFICATION FAILED',
  );
}

console.log('');
console.log('STAGE_16_8A_ENV_PATCH = PASS');
console.log('STORAGE_ROOT_CENTRALIZED = PASS');
console.log('LOCAL_STORAGE_FALLBACK = PASS');
