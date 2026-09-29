import { Module } from '@nestjs/common';
import { ComplianceModule } from '../compliance/compliance.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AspController } from './asp.controller.js';
import { AspService } from './asp.service.js';
import { MockAspAdapter } from './adapters/mock-asp.adapter.js';
import { RemoteAspAdapter } from './adapters/remote-asp.adapter.js';
import { ASP_ADAPTER } from './contracts/asp.tokens.js';
import { AspAdapterRegistry } from './registry/asp-adapter.registry.js';
import { AspHttpModule } from './transport/asp-http.module.js';

@Module({
  imports: [
    AuthModule,
    ComplianceModule,
    AspHttpModule,
  ],
  controllers: [
    AspController,
  ],
  providers: [
    AspService,
    MockAspAdapter,
    RemoteAspAdapter,
    AspAdapterRegistry,
    {
      provide: ASP_ADAPTER,
      inject: [
        AspAdapterRegistry,
      ],
      useFactory: (
        registry: AspAdapterRegistry,
      ) => registry.getConfigured(),
    },
  ],
  exports: [
    ASP_ADAPTER,
    AspService,
    AspAdapterRegistry,
  ],
})
export class AspModule {}
