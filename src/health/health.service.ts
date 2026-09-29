import {
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
      await this.prisma.$queryRawUnsafe(
        'SELECT 1',
      );

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
