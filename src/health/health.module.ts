import { Module } from '@nestjs/common';
import { UaePintAeSchematronService } from '../compliance/schematron/uae-pint-ae-schematron.service.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    UaePintAeSchematronService,
  ],
})
export class HealthModule {}
