import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TenantService } from './tenant.service.js';
import { TenantController } from './tenant.controller.js';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],
  providers: [TenantService],
  exports: [TenantService],
  controllers: [TenantController],
})
export class TenantModule {}
