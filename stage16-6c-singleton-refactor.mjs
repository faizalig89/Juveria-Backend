import fs from 'node:fs';

const featureModules = [
  './src/asp/asp.module.ts',
  './src/auth/auth.module.ts',
  './src/compliance/compliance.module.ts',
  './src/health/health.module.ts',
  './src/invoice/invoice.module.ts',
  './src/invoice-document/invoice-document.module.ts',
  './src/tenant/tenant.module.ts',
  './src/user/user.module.ts',
];

const appFile = './src/app.module.ts';

const allFiles = [
  appFile,
  ...featureModules,
];

for (const file of allFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(
      'STOP: missing module: ' + file,
    );
  }

  fs.copyFileSync(
    file,
    file + '.stage16-6c-singleton-backup',
  );
}

function removePrismaService(file) {
  let s = fs.readFileSync(file, 'utf8');

  s = s.replace(
    /^import\s+\{\s*PrismaService\s*\}\s+from\s+['"][^'"]*prisma\.service\.js['"];\r?\n/m,
    '',
  );

  s = s.replace(
    /,\s*PrismaService(?=\s*[,\]])/g,
    '',
  );

  s = s.replace(
    /PrismaService\s*,\s*/g,
    '',
  );

  fs.writeFileSync(file, s, 'utf8');
}

for (const file of featureModules) {
  removePrismaService(file);
}

/* AppModule */
let app = fs.readFileSync(appFile, 'utf8');

app = app.replace(
  "import { PrismaService } from './prisma/prisma.service.js';",
  "import { PrismaModule } from './prisma/prisma.module.js';",
);

if (
  !app.includes(
    "import { PrismaModule } from './prisma/prisma.module.js';",
  )
) {
  throw new Error(
    'STOP: PrismaModule import could not be installed.',
  );
}

const importsAnchor =
  '  imports: [\n';

if (!app.includes(importsAnchor)) {
  throw new Error(
    'STOP: AppModule imports anchor not found.',
  );
}

app = app.replace(
  importsAnchor,
  importsAnchor + '    PrismaModule,\n',
);

app = app.replace(
  /^\s*PrismaService,\r?\n/m,
  '',
);

fs.writeFileSync(appFile, app, 'utf8');

/* Verification */
const prismaModule =
  fs.readFileSync(
    './src/prisma/prisma.module.ts',
    'utf8',
  );

const appVerify =
  fs.readFileSync(appFile, 'utf8');

const checks = {
  globalPrismaModule:
    prismaModule.includes('@Global()'),

  singletonProvider:
    prismaModule.includes(
      'providers: [PrismaService]',
    ),

  appImportsPrismaModule:
    appVerify.includes(
      "import { PrismaModule } from './prisma/prisma.module.js';",
    ),

  appRegistersPrismaModule:
    appVerify.includes(
      '    PrismaModule,',
    ),

  appNoDirectPrismaProvider:
    !appVerify.includes(
      "import { PrismaService } from './prisma/prisma.service.js';",
    ),
};

let failed = false;

for (const file of featureModules) {
  const source =
    fs.readFileSync(file, 'utf8');

  const clean =
    !source.includes('PrismaService');

  checks[
    file + ':noDirectPrisma'
  ] = clean;
}

for (const [name, passed] of Object.entries(checks)) {
  console.log(name + ': ' + passed);

  if (!passed) {
    failed = true;
  }
}

if (failed) {
  for (const file of allFiles) {
    fs.copyFileSync(
      file + '.stage16-6c-singleton-backup',
      file,
    );
  }

  throw new Error(
    'VERIFY FAILED. All module backups restored.',
  );
}

console.log(
  'STAGE_16_6C_SINGLETON_REFACTOR = PASS',
);
console.log(
  'GLOBAL_PRISMA_MODULE = PASS',
);
console.log(
  'FEATURE_PRISMA_PROVIDERS_REMOVED = PASS',
);
