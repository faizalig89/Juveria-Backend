import fs from "fs";

const mainPath = "./src/main.ts";
const appModulePath = "./src/app.module.ts";
const authControllerPath = "./src/auth/auth.controller.ts";

for (const path of [
  mainPath,
  appModulePath,
  authControllerPath,
]) {
  if (!fs.existsSync(path)) {
    throw new Error(`Required file missing: ${path}`);
  }
}

/* ---------- BACKUPS ---------- */

fs.copyFileSync(
  mainPath,
  `${mainPath}.stage16-2-backup`,
);

fs.copyFileSync(
  appModulePath,
  `${appModulePath}.stage16-2-backup`,
);

fs.copyFileSync(
  authControllerPath,
  `${authControllerPath}.stage16-2-backup`,
);

/* ---------- MAIN.TS: HELMET + BODY LIMIT ---------- */

let main = fs.readFileSync(mainPath, "utf8");

if (!main.includes("import helmet from 'helmet';")) {
  main = main.replace(
    "import { NestFactory } from '@nestjs/core';",
    `import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import express from 'express';`,
  );
}

const factoryLine =
  "  const app =\n    await NestFactory.create(AppModule);";

if (!main.includes(factoryLine)) {
  throw new Error(
    "Unexpected main.ts NestFactory structure. STOP.",
  );
}

main = main.replace(
  factoryLine,
  `${factoryLine}

  app.use(helmet());

  app.use(
    express.json({
      limit: '1mb',
    }),
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: '1mb',
    }),
  );`,
);

fs.writeFileSync(mainPath, main, "utf8");

/* ---------- APP MODULE: GLOBAL THROTTLER ---------- */

let appModule =
  fs.readFileSync(appModulePath, "utf8");

if (
  !appModule.includes(
    "import { ThrottlerModule } from '@nestjs/throttler';",
  )
) {
  appModule = appModule.replace(
    "import { Module } from '@nestjs/common';",
    `import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';`,
  );
}

if (
  !appModule.includes(
    "import { APP_GUARD } from '@nestjs/core';",
  )
) {
  appModule = appModule.replace(
    "import { AppController } from './app.controller.js';",
    `import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller.js';`,
  );
}

appModule = appModule.replace(
  "  imports: [",
  `  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 120,
      },
    ]),`,
);

appModule = appModule.replace(
  "  providers: [AppService, PrismaService],",
  `  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],`,
);

fs.writeFileSync(
  appModulePath,
  appModule,
  "utf8",
);

/* ---------- AUTH CONTROLLER: STRICT LOGIN LIMIT ---------- */

let authController =
  fs.readFileSync(
    authControllerPath,
    "utf8",
  );

authController = authController.replace(
  "import { Body, Controller, Post } from '@nestjs/common';",
  `import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';`,
);

authController = authController.replace(
  "  @Post('login')\n  async login",
  `  @Post('login')
  @Throttle({
    default: {
      limit: 10,
      ttl: 60000,
    },
  })
  async login`,
);

fs.writeFileSync(
  authControllerPath,
  authController,
  "utf8",
);

/* ---------- ASSERTIONS ---------- */

const finalMain =
  fs.readFileSync(mainPath, "utf8");

const finalApp =
  fs.readFileSync(appModulePath, "utf8");

const finalAuth =
  fs.readFileSync(
    authControllerPath,
    "utf8",
  );

const checks = {
  helmetImported:
    finalMain.includes(
      "import helmet from 'helmet';",
    ),

  helmetEnabled:
    finalMain.includes(
      "app.use(helmet());",
    ),

  jsonLimit:
    finalMain.includes(
      "limit: '1mb'",
    ),

  throttlerModule:
    finalApp.includes(
      "ThrottlerModule.forRoot",
    ),

  globalGuard:
    finalApp.includes(
      "useClass: ThrottlerGuard",
    ),

  globalLimit120:
    finalApp.includes(
      "limit: 120",
    ),

  loginThrottle:
    finalAuth.includes(
      "@Throttle({",
    ),

  loginLimit10:
    finalAuth.includes(
      "limit: 10",
    ),
};

console.log(
  "\n===== STAGE 16.2 SOURCE ASSERTIONS =====",
);

console.log(checks);

if (
  Object.values(checks).some(
    value => value !== true,
  )
) {
  throw new Error(
    "Stage 16.2 source assertions failed. STOP.",
  );
}

console.log(
  "\nSTAGE_16_2_SOURCE_PATCH_PASSED",
);
