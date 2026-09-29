import { InvoiceDocumentController } from './invoice-document.controller.js';
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { StorageModule } from '../storage/module.js';

import { InvoiceDocumentService } from './invoice-document.service.js';
import { InvoiceFileValidatorService } from './invoice-file-validator.service.js';
import { JsonInvoiceMapperService } from '../invoice-ingestion/json-invoice-mapper.service.js';
import { CsvInvoiceMapperService } from '../invoice-ingestion/csv-invoice-mapper.service.js';

@Module({
  imports: [
    AuthModule,
    StorageModule,
  ],

  controllers: [
    InvoiceDocumentController,
  ],

  providers: [
    InvoiceDocumentService,
    InvoiceFileValidatorService,
    JsonInvoiceMapperService,
    CsvInvoiceMapperService,
  ],

  exports: [
    InvoiceDocumentService,
  ],
})
export class InvoiceDocumentModule {}