import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { InvoiceController } from './invoice.controller.js';
import { InvoiceService } from './invoice.service.js';

@Module({
  imports: [AuthModule],
  controllers: [InvoiceController],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}