import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { UserModule } from './user/user.module.js';
import { AuthModule } from './auth/auth.module.js';
import { InvoiceModule } from './invoice/invoice.module.js';
import { InvoiceDocumentModule } from './invoice-document/invoice-document.module.js';
import { ComplianceModule } from './compliance/compliance.module.js';
import { AspModule } from './asp/asp.module.js';
import { HealthModule } from './health/health.module.js';
import { AuditModule } from './audit/audit.module.js';
import { IntegrationModule } from './integration/integration.module.js';

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 120,
      },
    ]),
    TenantModule,
    UserModule,
    AuthModule,
    InvoiceModule,
    InvoiceDocumentModule,
    ComplianceModule,
    AspModule,
    HealthModule,
    AuditModule,
    IntegrationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
