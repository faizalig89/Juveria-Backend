import {
  BadRequestException,
  Get,
  Param,
  Res,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { InvoiceDocumentService } from './invoice-document.service.js';
import { InvoiceFileValidatorService } from './invoice-file-validator.service.js';
import { StorageService } from '../storage/service.js';
import { JsonInvoiceMapperService } from '../invoice-ingestion/json-invoice-mapper.service.js';
import { CsvInvoiceMapperService } from '../invoice-ingestion/csv-invoice-mapper.service.js';
import type { Response } from 'express';

@Controller('invoice-document')
export class InvoiceDocumentController {
  constructor(
    private readonly invoiceDocumentService: InvoiceDocumentService,
    private readonly invoiceFileValidatorService: InvoiceFileValidatorService,
    private readonly storageService: StorageService,
    private readonly jsonInvoiceMapperService: JsonInvoiceMapperService,
    private readonly csvInvoiceMapperService: CsvInvoiceMapperService,
  ) {}

  private async streamDocument(
    id: string,
    req: any,
    res: Response,
    disposition: 'inline' | 'attachment',
  ) {
    const { tenantId } = req.user;

    if (!tenantId) {
      throw new BadRequestException(
        'Authenticated tenant information is required',
      );
    }

    const document =
      await this.invoiceDocumentService.findOne(id, tenantId);

    res.setHeader('Content-Type', document.mimeType);

    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${document.originalName}"`,
    );

    res.setHeader(
      'Content-Length',
      document.fileSize.toString(),
    );

    this.storageService
      .createReadStream(document.storageKey)
      .pipe(res);
  }

  @Get(':id/view')
  @UseGuards(JwtAuthGuard)
  async view(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    return this.streamDocument(id, req, res, 'inline');
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  async downloadFile(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    return this.streamDocument(
      id,
      req,
      res,
      'attachment',
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async download(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    return this.streamDocument(
      id,
      req,
      res,
      'attachment',
    );
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile()
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    @Body()
    body: {
      invoiceNumber: string;
      invoiceDate: string;
      currency: string;
      totalAmount: string;
    },
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Invoice file is required',
      );
    }


    const {
      tenantId,
      userId: uploadedById,
    } = req.user;

    if (!tenantId || !uploadedById) {
      throw new BadRequestException(
        'Authenticated tenant and user information is required',
      );
    }

    const extension = file.originalname.includes('.')
      ? file.originalname
          .substring(
            file.originalname.lastIndexOf('.'),
          )
          .toLowerCase()
      : '';
    if (
      extension !== '.json' &&
      extension !== '.csv' &&
      (
        !body.invoiceNumber ||
        !body.invoiceDate ||
        !body.currency ||
        !body.totalAmount
      )
    ) {
      throw new BadRequestException(
        'Invoice number, date, currency and total amount are required',
      );
    }

    const fileName =
      this.storageService.generateFileName(
        file.originalname,
      );

    const uploadDirectory =
      this.storageService.getUploadDirectory();

    const fs = await import('fs/promises');
    const path = await import('path');

    await fs.mkdir(uploadDirectory, {
      recursive: true,
    });

    const filePath = path.join(
      uploadDirectory,
      fileName,
    );

    try {
      await fs.writeFile(
        filePath,
        file.buffer,
      );
      await this.invoiceFileValidatorService.validate(
        filePath,
        extension,
      );

      let invoice;

      if (extension === '.json') {
        let parsedJson: unknown;

        try {
          const jsonContent = file.buffer
            .toString('utf8')
            .replace(/^\uFEFF/, '');

          parsedJson = JSON.parse(jsonContent);
        } catch {
          throw new BadRequestException(
            'Invalid JSON invoice',
          );
        }

        const ingestion =
          this.jsonInvoiceMapperService.map(
            parsedJson,
          );

        invoice =
          await this.invoiceDocumentService.createIngestedInvoiceWithDocument({
            tenantId,
            uploadedById,
            invoice: ingestion.invoice,
            originalName: file.originalname,
            storageKey: fileName,
            mimeType: file.mimetype,
            fileSize: file.size,
          });
      } else if (extension === '.csv') {
        const csvContent =
          file.buffer.toString('utf8');

        const ingestion =
          this.csvInvoiceMapperService.map(
            csvContent,
          );

        invoice =
          await this.invoiceDocumentService.createIngestedInvoiceWithDocument({
            tenantId,
            uploadedById,
            invoice: ingestion.invoice,
            originalName: file.originalname,
            storageKey: fileName,
            mimeType: file.mimetype,
            fileSize: file.size,
          });
      } else {
        invoice =
          await this.invoiceDocumentService.createInvoiceWithDocument({
            tenantId,
            uploadedById,
            invoiceNumber: body.invoiceNumber,
            invoiceDate: body.invoiceDate,
            currency: body.currency,
            totalAmount: body.totalAmount,
            originalName: file.originalname,
            storageKey: fileName,
            mimeType: file.mimetype,
            fileSize: file.size,
          });
      }

      return {
        message:
          'Invoice and document created successfully',
        invoice,
      };
    } catch (error) {
      await fs.unlink(filePath).catch(() => {});
      throw error;
    }
  }
}
