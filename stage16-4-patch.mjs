import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const healthDir = path.join(
  root,
  'src',
  'health',
);

const controllerPath = path.join(
  healthDir,
  'health.controller.ts',
);

const servicePath = path.join(
  healthDir,
  'health.service.ts',
);

const modulePath = path.join(
  healthDir,
  'health.module.ts',
);

const appModulePath = path.join(
  root,
  'src',
  'app.module.ts',
);

let appModule =
  fs.readFileSync(appModulePath, 'utf8');

if (appModule.includes('HealthModule')) {
  throw new Error(
    'HealthModule already exists in AppModule. No changes written.',
  );
}

fs.mkdirSync(
  healthDir,
  { recursive: true },
);

fs.copyFileSync(
  appModulePath,
  `${appModulePath}.stage16-4-backup`,
);

const service = `import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  liveness() {
    return {
      status: 'ok',
      service: 'juveria-api',
    };
  }

  async readiness() {
    try {
      await this.prisma.$queryRaw\`
        SELECT 1
      \`;

      return {
        status: 'ready',
        service: 'juveria-api',
        database: 'reachable',
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        service: 'juveria-api',
        database: 'unreachable',
      });
    }
  }
}
`;

const controller = `import {
  Controller,
  Get,
} from '@nestjs/common';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService:
      HealthService,
  ) {}

  @Get('live')
  live() {
    return this.healthService.liveness();
  }

  @Get('ready')
  ready() {
    return this.healthService.readiness();
  }
}
`;

const module = `import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    PrismaService,
  ],
})
export class HealthModule {}
`;

fs.writeFileSync(
  servicePath,
  service,
  'utf8',
);

fs.writeFileSync(
  controllerPath,
  controller,
  'utf8',
);

fs.writeFileSync(
  modulePath,
  module,
  'utf8',
);

appModule = appModule.replace(
  "import { AspModule } from './asp/asp.module.js';",
  "import { AspModule } from './asp/asp.module.js';\nimport { HealthModule } from './health/health.module.js';",
);

appModule = appModule.replace(
  '    AspModule,\n',
  '    AspModule,\n    HealthModule,\n',
);

if (
  !appModule.includes(
    "import { HealthModule } from './health/health.module.js';",
  ) ||
  !appModule.includes('    HealthModule,')
) {
  throw new Error(
    'HealthModule registration failed. AppModule not written.',
  );
}

fs.writeFileSync(
  appModulePath,
  appModule,
  'utf8',
);

console.log('STAGE_16_4_SOURCE_PATCHED');
console.log('HEALTH_LIVENESS_CREATED');
console.log('HEALTH_READINESS_CREATED');
console.log('DATABASE_PROBE_CREATED');
console.log('NO_SECRET_EXPOSURE_ADDED');
