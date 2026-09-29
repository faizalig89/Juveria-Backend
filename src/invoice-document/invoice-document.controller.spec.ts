import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceDocumentController } from './invoice-document.controller.js';

describe('InvoiceDocumentController', () => {
  let controller: InvoiceDocumentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoiceDocumentController],
    }).compile();

    controller = module.get<InvoiceDocumentController>(InvoiceDocumentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
