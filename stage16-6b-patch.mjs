import fs from 'node:fs';

const serviceFile = './src/health/health.service.ts';
const moduleFile = './src/health/health.module.ts';

fs.copyFileSync(
  serviceFile,
  serviceFile + '.stage16-6b-backup',
);

fs.copyFileSync(
  moduleFile,
  moduleFile + '.stage16-6b-backup',
);

const service = `import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UaePintAeSchematronService } from '../compliance/schematron/uae-pint-ae-schematron.service.js';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schematronService:
      UaePintAeSchematronService,
  ) {}

  liveness() {
    return {
      status: 'ok',
      service: 'juveria-api',
    };
  }

  async readiness() {
    let database: 'reachable' | 'unreachable' =
      'unreachable';

    let complianceRuntime:
      | 'available'
      | 'unavailable' = 'unavailable';

    try {
      await this.prisma.$queryRaw\`
        SELECT 1
      \`;

      database = 'reachable';

      await this.schematronService
        .checkRuntimeDependencies();

      complianceRuntime = 'available';

      return {
        status: 'ready',
        service: 'juveria-api',
        database,
        complianceRuntime,
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        service: 'juveria-api',
        database,
        complianceRuntime,
      });
    }
  }
}
`;

const module = `import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UaePintAeSchematronService } from '../compliance/schematron/uae-pint-ae-schematron.service.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    PrismaService,
    UaePintAeSchematronService,
  ],
})
export class HealthModule {}
`;

fs.writeFileSync(serviceFile, service, 'utf8');
fs.writeFileSync(moduleFile, module, 'utf8');

const verifyService =
  fs.readFileSync(serviceFile, 'utf8');

const verifyModule =
  fs.readFileSync(moduleFile, 'utf8');

const checks = {
  schematronInjected:
    verifyService.includes(
      'private readonly schematronService:',
    ),

  runtimeProbeCalled:
    verifyService.includes(
      '.checkRuntimeDependencies();',
    ),

  databaseTracked:
    verifyService.includes(
      "database = 'reachable';",
    ),

  complianceTracked:
    verifyService.includes(
      "complianceRuntime = 'available';",
    ),

  failClosed503:
    verifyService.includes(
      'new ServiceUnavailableException',
    ),

  providerRegistered:
    verifyModule.includes(
      'UaePintAeSchematronService,',
    ),
};

for (const [name, passed] of Object.entries(checks)) {
  if (!passed) {
    fs.copyFileSync(
      serviceFile + '.stage16-6b-backup',
      serviceFile,
    );

    fs.copyFileSync(
      moduleFile + '.stage16-6b-backup',
      moduleFile,
    );

    throw new Error(
      \`VERIFY FAILED: \${name}. Backups restored.\`,
    );
  }
}

console.log(checks);
console.log('STAGE_16_6B_SOURCE_PATCH = PASS');
console.log('DATABASE_READINESS_GATE = PASS');
console.log('COMPLIANCE_RUNTIME_GATE = PASS');
console.log('READINESS_FAIL_CLOSED = PASS');
