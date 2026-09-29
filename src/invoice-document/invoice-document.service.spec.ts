import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceDocumentService } from './invoice-document.service.js';

describe('InvoiceDocumentService', () => {
  let service: InvoiceDocumentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InvoiceDocumentService],
    }).compile();

    service = module.get<InvoiceDocumentService>(InvoiceDocumentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
