import fs from "fs";

const mainPath = "./src/main.ts";
const authServicePath = "./src/auth/auth.service.ts";
const authModulePath = "./src/auth/auth.module.ts";
const jwtStrategyPath =
  "./src/auth/strategies/jwt.strategy.ts";
const configDir = "./src/config";
const envPath = "./src/config/env.ts";

for (const path of [
  mainPath,
  authServicePath,
  authModulePath,
  jwtStrategyPath,
]) {
  if (!fs.existsSync(path)) {
    throw new Error(`Required file missing: ${path}`);
  }
}

/* ---------- BACKUPS ---------- */

fs.copyFileSync(
  mainPath,
  `${mainPath}.stage16-1-backup`,
);

fs.copyFileSync(
  authServicePath,
  `${authServicePath}.stage16-1-backup`,
);

fs.copyFileSync(
  authModulePath,
  `${authModulePath}.stage16-1-backup`,
);

fs.copyFileSync(
  jwtStrategyPath,
  `${jwtStrategyPath}.stage16-1-backup`,
);

/* ---------- CENTRAL ENV VALIDATION ---------- */

fs.mkdirSync(configDir, {
  recursive: true,
});

const envSource = `const requireEnv = (
  name: string,
): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      \`Missing required environment variable: \${name}\`,
    );
  }

  return value;
};

const parsePort = (
  value: string | undefined,
): number => {
  if (!value) {
    return 4000;
  }

  const port = Number(value);

  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(
      'PORT must be an integer between 1 and 65535.',
    );
  }

  return port;
};

const parseCorsOrigins = (
  value: string | undefined,
): string[] => {
  const raw =
    value?.trim() ||
    'http://localhost:3000';

  const origins = raw
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error(
      'CORS_ORIGINS must contain at least one origin.',
    );
  }

  for (const origin of origins) {
    let url: URL;

    try {
      url = new URL(origin);
    } catch {
      throw new Error(
        \`Invalid CORS origin: \${origin}\`,
      );
    }

    if (
      url.protocol !== 'http:' &&
      url.protocol !== 'https:'
    ) {
      throw new Error(
        \`Invalid CORS protocol: \${origin}\`,
      );
    }

    if (url.origin !== origin) {
      throw new Error(
        \`CORS origin must not contain a path: \${origin}\`,
      );
    }
  }

  return origins;
};

const nodeEnv =
  process.env.NODE_ENV?.trim() ||
  'development';

if (
  ![
    'development',
    'test',
    'production',
  ].includes(nodeEnv)
) {
  throw new Error(
    'NODE_ENV must be development, test, or production.',
  );
}

const databaseUrl =
  requireEnv('DATABASE_URL');

const jwtSecret =
  requireEnv('JWT_SECRET');

if (
  nodeEnv === 'production' &&
  jwtSecret.length < 32
) {
  throw new Error(
    'JWT_SECRET must be at least 32 characters in production.',
  );
}

export const env = Object.freeze({
  nodeEnv,
  isProduction:
    nodeEnv === 'production',
  databaseUrl,
  jwtSecret,
  port: parsePort(
    process.env.PORT,
  ),
  corsOrigins:
    parseCorsOrigins(
      process.env.CORS_ORIGINS,
    ),
});
`;

fs.writeFileSync(
  envPath,
  envSource,
  "utf8",
);

/* ---------- AUTH SERVICE ---------- */

let authService =
  fs.readFileSync(
    authServicePath,
    "utf8",
  );

authService = authService.replace(
  /^\s*console\.log\([\s\S]*?\);\r?\n/gm,
  "",
);

/*
 * The regex above intentionally targets complete
 * console.log statements. Assert that none remain.
 */
if (
  /console\.(log|debug)\s*\(/.test(
    authService,
  )
) {
  throw new Error(
    "Auth debug logging remains after cleanup. STOP."
  );
}

fs.writeFileSync(
  authServicePath,
  authService,
  "utf8",
);

/* ---------- AUTH MODULE ---------- */

let authModule =
  fs.readFileSync(
    authModulePath,
    "utf8",
  );

if (
  !authModule.includes(
    "import { Module } from '@nestjs/common';",
  )
) {
  throw new Error(
    "Unexpected AuthModule structure. STOP."
  );
}

authModule = authModule.replace(
  "import { Module } from '@nestjs/common';",
  `import { Module } from '@nestjs/common';
import { env } from '../config/env.js';`,
);

authModule = authModule.replace(
  "secret: process.env.JWT_SECRET,",
  "secret: env.jwtSecret,",
);

if (
  authModule.includes(
    "process.env.JWT_SECRET",
  )
) {
  throw new Error(
    "Direct JWT_SECRET access remains in AuthModule."
  );
}

fs.writeFileSync(
  authModulePath,
  authModule,
  "utf8",
);

/* ---------- JWT STRATEGY ---------- */

let strategy =
  fs.readFileSync(
    jwtStrategyPath,
    "utf8",
  );

strategy = strategy.replace(
  "import { Injectable } from '@nestjs/common';",
  `import { Injectable } from '@nestjs/common';
import { env } from '../../config/env.js';`,
);

strategy = strategy.replace(
  "secretOrKey: process.env.JWT_SECRET!,",
  "secretOrKey: env.jwtSecret,",
);

if (
  strategy.includes(
    "process.env.JWT_SECRET",
  )
) {
  throw new Error(
    "Direct JWT_SECRET access remains in JwtStrategy."
  );
}

fs.writeFileSync(
  jwtStrategyPath,
  strategy,
  "utf8",
);

/* ---------- MAIN ---------- */

const mainSource = `import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { env } from './config/env.js';

async function bootstrap() {
  const app =
    await NestFactory.create(AppModule);

  app.enableCors({
    origin: env.corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  await app.listen(env.port);
}

await bootstrap();
`;

fs.writeFileSync(
  mainPath,
  mainSource,
  "utf8",
);

/* ---------- SOURCE ASSERTIONS ---------- */

const allSource = [
  fs.readFileSync(
    authServicePath,
    "utf8",
  ),
  fs.readFileSync(
    authModulePath,
    "utf8",
  ),
  fs.readFileSync(
    jwtStrategyPath,
    "utf8",
  ),
  fs.readFileSync(
    mainPath,
    "utf8",
  ),
  fs.readFileSync(
    envPath,
    "utf8",
  ),
].join("\n");

const checks = {
  centralEnvExists:
    fs.existsSync(envPath),

  databaseRequired:
    allSource.includes(
      "requireEnv('DATABASE_URL')",
    ),

  jwtRequired:
    allSource.includes(
      "requireEnv('JWT_SECRET')",
    ),

  productionSecretLength:
    allSource.includes(
      "jwtSecret.length < 32",
    ),

  configurableCors:
    allSource.includes(
      "CORS_ORIGINS",
    ),

  portValidated:
    allSource.includes(
      "PORT must be an integer",
    ),

  shutdownHooks:
    allSource.includes(
      "app.enableShutdownHooks()",
    ),

  noAuthDebugMarker:
    !allSource.includes(
      "AUTH DEBUG",
    ),

  noConsoleLoggingInAuth:
    !fs
      .readFileSync(
        authServicePath,
        "utf8",
      )
      .match(
        /console\.(log|debug)\s*\(/
      ),

  authModuleUsesValidatedSecret:
    fs
      .readFileSync(
        authModulePath,
        "utf8",
      )
      .includes(
        "secret: env.jwtSecret",
      ),

  strategyUsesValidatedSecret:
    fs
      .readFileSync(
        jwtStrategyPath,
        "utf8",
      )
      .includes(
        "secretOrKey: env.jwtSecret",
      ),
};

console.log(
  "\n===== STAGE 16.1 SOURCE ASSERTIONS ====="
);

console.log(checks);

if (
  Object.values(checks).some(
    value => value !== true
  )
) {
  throw new Error(
    "Stage 16.1 source assertions failed. STOP."
  );
}

console.log(
  "\nSTAGE_16_1_SECURITY_PATCHED"
);
