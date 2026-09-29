import { spawnSync } from 'node:child_process';

const envModule =
  new URL(
    './dist/config/env.js',
    import.meta.url,
  ).pathname;

function runCase(name, overrides) {
  const testEnv = {
    ...process.env,
    DATABASE_URL:
      'postgresql://test:test@localhost:5432/test',
    JWT_SECRET:
      '0123456789012345678901234567890123456789',
    NODE_ENV: 'production',
    PORT: '4000',
    CORS_ORIGINS:
      'https://juveria.example.com',
    ...overrides,
  };

  for (const [key, value] of Object.entries(testEnv)) {
    if (value === null) {
      delete testEnv[key];
    }
  }

  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `await import(${JSON.stringify(
        new URL(
          './dist/config/env.js',
          import.meta.url,
        ).href,
      )});`,
    ],
    {
      env: testEnv,
      encoding: 'utf8',
    },
  );

  console.log(
    `${name}: exit=${result.status}`,
  );

  return result.status;
}

const valid = runCase(
  'VALID_PRODUCTION_CONFIG',
  {},
);

const missingDb = runCase(
  'MISSING_DATABASE_URL',
  {
    DATABASE_URL: null,
  },
);

const weakJwt = runCase(
  'WEAK_JWT_SECRET',
  {
    JWT_SECRET: 'too-short',
  },
);

const badPort = runCase(
  'INVALID_PORT',
  {
    PORT: '99999',
  },
);

const badCors = runCase(
  'INVALID_CORS_ORIGIN',
  {
    CORS_ORIGINS:
      'https://juveria.example.com/path',
  },
);

if (valid !== 0) {
  throw new Error(
    'FAIL: valid production configuration rejected.',
  );
}

if (
  missingDb === 0 ||
  weakJwt === 0 ||
  badPort === 0 ||
  badCors === 0
) {
  throw new Error(
    'FAIL: invalid production configuration was accepted.',
  );
}

console.log('');
console.log(
  'STAGE_16_8B_ENV_RUNTIME = PASS',
);
console.log(
  'VALID_PRODUCTION_CONFIG = PASS',
);
console.log(
  'MISSING_DATABASE_FAIL_CLOSED = PASS',
);
console.log(
  'WEAK_JWT_FAIL_CLOSED = PASS',
);
console.log(
  'INVALID_PORT_FAIL_CLOSED = PASS',
);
console.log(
  'INVALID_CORS_FAIL_CLOSED = PASS',
);
