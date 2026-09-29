import { ErpEnabledGuard } from './erp-enabled.guard.js';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ComplianceModule } from '../compliance/compliance.module.js';
import {
  UaeEinvoiceReadinessService,
} from '../compliance/readiness/uae-einvoice-readiness.service.js';
import { AspModule } from '../asp/asp.module.js';
import {
  AspService,
} from '../asp/asp.service.js';
import {
  IntegrationController,
} from './integration.controller.js';
import {
  IntegrationCryptoService,
} from './integration.crypto.service.js';
import {
  IntegrationProviderService,
} from './integration.provider.service.js';
import {
  INTEGRATION_ASP_PORT,
  INTEGRATION_READINESS_PORT,
  IntegrationCompliancePipelineService,
} from './integration.compliance-pipeline.service.js';
import {
  IntegrationService,
} from './integration.service.js';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    ComplianceModule,
    AspModule,
  ],
  controllers: [
    IntegrationController,
  ],
  providers: [
    ErpEnabledGuard,
    IntegrationCryptoService,
    IntegrationProviderService,
    {
      provide:
        INTEGRATION_READINESS_PORT,
      useExisting:
        UaeEinvoiceReadinessService,
    },
    {
      provide:
        INTEGRATION_ASP_PORT,
      useExisting:
        AspService,
    },
    IntegrationCompliancePipelineService,
    IntegrationService,
  ],
  exports: [
    IntegrationService,
  ],
})
export class IntegrationModule {}
