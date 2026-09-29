import fs from 'node:fs';

const dockerfile = './Dockerfile';
const dockerignore = './.dockerignore';

if (fs.existsSync(dockerfile)) {
  throw new Error(
    'STOP: Dockerfile already exists. No files changed.',
  );
}

if (fs.existsSync(dockerignore)) {
  throw new Error(
    'STOP: .dockerignore already exists. No files changed.',
  );
}

const dockerfileSource = [
  '# syntax=docker/dockerfile:1',
  '',
  '# ---------- Build stage ----------',
  'FROM node:24-bookworm-slim AS builder',
  '',
  'WORKDIR /app',
  '',
  'COPY package.json package-lock.json ./',
  'COPY prisma ./prisma',
  'COPY prisma.config.ts ./',
  '',
  'RUN npm ci',
  '',
  'COPY nest-cli.json tsconfig.json tsconfig.build.json ./',
  'COPY src ./src',
  '',
  'RUN npx prisma generate',
  'RUN npm run build',
  '',
  '# ---------- Production stage ----------',
  'FROM node:24-bookworm-slim AS production',
  '',
  'ENV NODE_ENV=production',
  'ENV PORT=4000',
  '',
  '# Java is required by the official PINT-AE Schematron engine.',
  'RUN apt-get update \\',
  '    && apt-get install -y --no-install-recommends openjdk-21-jre-headless ca-certificates \\',
  '    && rm -rf /var/lib/apt/lists/*',
  '',
  'WORKDIR /app',
  '',
  'COPY package.json package-lock.json ./',
  'COPY prisma ./prisma',
  'COPY prisma.config.ts ./',
  '',
  'RUN npm ci --omit=dev \\',
  '    && npm cache clean --force',
  '',
  'COPY --from=builder /app/dist ./dist',
  'COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma',
  'COPY tools/saxon ./tools/saxon',
  'COPY pint-ae/1.4.4 ./pint-ae/1.4.4',
  '',
  '# Local uploads are intentionally not copied.',
  '# Production document storage must be persistent/external.',
  '',
  'RUN groupadd --system juveria \\',
  '    && useradd --system --gid juveria --create-home juveria \\',
  '    && chown -R juveria:juveria /app',
  '',
  'USER juveria',
  '',
  'EXPOSE 4000',
  '',
  'CMD ["node", "dist/main.js"]',
  '',
].join('\n');

const dockerignoreSource = [
  '# Secrets',
  '.env',
  '.env.*',
  '!.env.example',
  '',
  '# Dependencies / build output',
  'node_modules',
  'dist',
  'coverage',
  '',
  '# Runtime/local data',
  'uploads',
  'tmp',
  '*.log',
  '',
  '# Version control / editors',
  '.git',
  '.gitignore',
  '.vscode',
  '.idea',
  '',
  '# Tests and temporary scripts',
  '*.test.*',
  '*.spec.*',
  'stage*.mjs',
  '',
  '# Local backups',
  '*.bak*',
  '*.backup',
  '*-backup',
  '*-backup.*',
  '*.stage*-backup',
  '*.stage*-backup.*',
  'prisma/*.bak*',
  'prisma/*backup*',
  'prisma/*before*',
  'prisma/*pre-stage*',
  'prisma/*stage*-backup*',
  '',
  '# Misc local files',
  '.DS_Store',
  'Thumbs.db',
  '',
].join('\n');

fs.writeFileSync(
  dockerfile,
  dockerfileSource,
  'utf8',
);

fs.writeFileSync(
  dockerignore,
  dockerignoreSource,
  'utf8',
);

const d =
  fs.readFileSync(dockerfile, 'utf8');

const i =
  fs.readFileSync(dockerignore, 'utf8');

const checks = {
  multiStage:
    d.includes('AS builder') &&
    d.includes('AS production'),

  node24:
    d.includes('node:24-bookworm-slim'),

  java21:
    d.includes('openjdk-21-jre-headless'),

  productionEnv:
    d.includes('ENV NODE_ENV=production'),

  nonRoot:
    d.includes('USER juveria'),

  prismaIncluded:
    d.includes('COPY prisma ./prisma'),

  migrationsAvailable:
    fs.existsSync(
      './prisma/migrations/migration_lock.toml',
    ),

  saxonIncluded:
    d.includes(
      'COPY tools/saxon ./tools/saxon',
    ),

  pintAeIncluded:
    d.includes(
      'COPY pint-ae/1.4.4 ./pint-ae/1.4.4',
    ),

  uploadsExcluded:
    i.includes('uploads'),

  envExcluded:
    i.includes('.env'),

  backupsExcluded:
    i.includes('*.bak*'),

  testScriptsExcluded:
    i.includes('stage*.mjs'),
};

let failed = false;

for (const [name, passed] of Object.entries(checks)) {
  console.log(name + ': ' + passed);

  if (!passed) {
    failed = true;
  }
}

if (failed) {
  fs.rmSync(dockerfile, { force: true });
  fs.rmSync(dockerignore, { force: true });

  throw new Error(
    'PACKAGING VERIFY FAILED. Generated files removed.',
  );
}

console.log('');
console.log('STAGE_16_6D_PACKAGING_CREATED = PASS');
console.log('MULTI_STAGE_BUILD = PASS');
console.log('JAVA_21_RUNTIME = PASS');
console.log('PRISMA_MIGRATIONS_INCLUDED = PASS');
console.log('SAXON_RUNTIME_INCLUDED = PASS');
console.log('PINT_AE_1_4_4_INCLUDED = PASS');
console.log('NON_ROOT_RUNTIME = PASS');
console.log('SECRETS_EXCLUDED = PASS');
console.log('LOCAL_UPLOADS_EXCLUDED = PASS');
console.log('BACKUPS_EXCLUDED = PASS');
