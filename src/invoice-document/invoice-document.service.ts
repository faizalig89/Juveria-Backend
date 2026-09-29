import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { IngestedInvoice } from '../invoice-ingestion/invoice-ingestion.types.js';

@Injectable()
export class InvoiceDocumentService {
  constructor(private readonly prisma: PrismaService) {}

  async createInvoiceWithDocument(data: {
    tenantId: string;
    uploadedById: string;
    invoiceNumber: string;
    invoiceDate: string;
    currency: string;
    totalAmount: string;
    originalName: string;
    storageKey: string;
    mimeType: string;
    fileSize: number;
  }) {
    return this.prisma.invoice.create({
      data: {
        tenantId: data.tenantId,
        uploadedById: data.uploadedById,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: new Date(data.invoiceDate),
        currency: data.currency,
        totalAmount: data.totalAmount,
        status: 'RECEIVED',

        documents: {
          create: {
            tenantId: data.tenantId,
            uploadedById: data.uploadedById,
            originalName: data.originalName,
            storageKey: data.storageKey,
            mimeType: data.mimeType,
            fileSize: data.fileSize,
            status: 'UPLOADED',
          },
        },
      },
      include: {
        documents: true,
      },
    });
  }

  async createIngestedInvoiceWithDocument(data: {
    tenantId: string;
    uploadedById: string;
    invoice: IngestedInvoice;
    originalName: string;
    storageKey: string;
    mimeType: string;
    fileSize: number;
  }) {
    const invoice = data.invoice;

    return this.prisma.invoice.create({
      data: {
        tenantId: data.tenantId,
        uploadedById: data.uploadedById,

        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: new Date(invoice.invoiceDate),
        currency: invoice.currency,
        totalAmount: invoice.totalAmount,

        status: 'RECEIVED',
        complianceStatus: 'PENDING',

        jurisdiction: invoice.jurisdiction,
        invoiceTypeCode: invoice.invoiceTypeCode,
        transactionTypeCode:
          invoice.transactionTypeCode,

        paymentDueDate:
          invoice.paymentDueDate
            ? new Date(invoice.paymentDueDate)
            : undefined,

        businessProcessType:
          invoice.businessProcessType,

        specificationIdentifier:
          invoice.specificationIdentifier,

        paymentMeansTypeCode:
          invoice.paymentMeansTypeCode,

        paymentAccountIdentifier:
          invoice.paymentAccountIdentifier,

        creditNoteReasonCode:
          invoice.creditNoteReasonCode,

        creditNoteReasonText:
          invoice.creditNoteReasonText,

        precedingInvoiceReference:
          invoice.precedingInvoiceReference,

        lineNetTotal: invoice.lineNetTotal,
        allowanceTotal: invoice.allowanceTotal,
        chargeTotal: invoice.chargeTotal,
        totalWithoutTax: invoice.totalWithoutTax,
        totalTaxAmount: invoice.totalTaxAmount,
        totalWithTax: invoice.totalWithTax,
        paidAmount: invoice.paidAmount,
        roundingAmount: invoice.roundingAmount,
        amountDue: invoice.amountDue,

        parties: invoice.parties?.length
          ? {
              create: invoice.parties,
            }
          : undefined,

        taxBreakdowns:
          invoice.taxBreakdowns?.length
            ? {
                create: invoice.taxBreakdowns,
              }
            : undefined,

        lines: invoice.lines?.length
          ? {
              create: invoice.lines,
            }
          : undefined,

        allowanceCharges:
          invoice.allowanceCharges?.length
            ? {
                create:
                  invoice.allowanceCharges,
              }
            : undefined,

        documents: {
          create: {
            tenantId: data.tenantId,
            uploadedById: data.uploadedById,
            originalName: data.originalName,
            storageKey: data.storageKey,
            mimeType: data.mimeType,
            fileSize: data.fileSize,
            status: 'UPLOADED',
          },
        },
      },

      include: {
        documents: true,
        parties: true,
        taxBreakdowns: true,
        lines: true,
        allowanceCharges: true,
      },
    });
  }
  async findOne(documentId: string, tenantId: string) {
    const document =
      await this.prisma.invoiceDocument.findFirst({
        where: {
          id: documentId,
          tenantId,
        },
      });

    if (!document) {
      throw new NotFoundException(
        'Document not found',
      );
    }

    return document;
  }
}