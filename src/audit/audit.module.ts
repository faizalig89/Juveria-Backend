import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuditController } from './audit.controller.js';
import { AuditService } from './audit.service.js';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],
  controllers: [
    AuditController,
  ],
  providers: [
    AuditService,
  ],
  exports: [
    AuditService,
  ],
})
export class AuditModule {}
