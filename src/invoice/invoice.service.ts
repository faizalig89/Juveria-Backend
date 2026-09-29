import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateInvoiceDto } from './dto/create-invoice.dto.js';
import { UpdateInvoiceRemediationDto } from './dto/update-invoice-remediation.dto.js';
import type { IngestedInvoice } from '../invoice-ingestion/invoice-ingestion.types.js';

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateInvoiceDto,
    tenantId: string,
    uploadedById: string,
  ) {
    return this.prisma.invoice.create({
      data: {
        tenantId,
        uploadedById,
        invoiceNumber: dto.invoiceNumber,
        invoiceDate: new Date(dto.invoiceDate),
        currency: dto.currency,
        totalAmount: dto.totalAmount,
        status: 'RECEIVED',

        jurisdiction: dto.jurisdiction,
        invoiceTypeCode: dto.invoiceTypeCode,
        transactionTypeCode: dto.transactionTypeCode,
        paymentDueDate: dto.paymentDueDate
          ? new Date(dto.paymentDueDate)
          : undefined,
        businessProcessType: dto.businessProcessType,
        specificationIdentifier: dto.specificationIdentifier,
        paymentMeansTypeCode: dto.paymentMeansTypeCode,

        lineNetTotal: dto.lineNetTotal,
        totalWithoutTax: dto.totalWithoutTax,
        totalTaxAmount: dto.totalTaxAmount,
        totalWithTax: dto.totalWithTax,
        amountDue: dto.amountDue,

        parties: dto.parties?.length
          ? {
              create: dto.parties,
            }
          : undefined,

        taxBreakdowns: dto.taxBreakdowns?.length
          ? {
              create: dto.taxBreakdowns,
            }
          : undefined,

        lines: dto.lines?.length
          ? {
              create: dto.lines,
            }
          : undefined,
      },
      include: {
        parties: true,
        taxBreakdowns: true,
        lines: true,
        documents: true,
      },
    });
  }

  async createFromIngestion(
    invoice: IngestedInvoice,
    tenantId: string,
    uploadedById: string,
  ) {
    return this.prisma.invoice.create({
      data: {
        tenantId,
        uploadedById,

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

        lineNetTotal:
          invoice.lineNetTotal,

        allowanceTotal:
          invoice.allowanceTotal,

        chargeTotal:
          invoice.chargeTotal,

        totalWithoutTax:
          invoice.totalWithoutTax,

        totalTaxAmount:
          invoice.totalTaxAmount,

        totalWithTax:
          invoice.totalWithTax,

        paidAmount:
          invoice.paidAmount,

        roundingAmount:
          invoice.roundingAmount,

        amountDue:
          invoice.amountDue,

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
      },

      include: {
        parties: true,
        taxBreakdowns: true,
        lines: true,
        allowanceCharges: true,
        documents: true,
      },
    });
  }
  async updateRemediation(
    id: string,
    tenantId: string,
    userId: string,
    dto: UpdateInvoiceRemediationDto,
  ) {
    const existing = await this.prisma.invoice.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        status: true,
        complianceStatus: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Invoice not found');
    }

    const data = {
      ...(dto.invoiceNumber !== undefined && {
        invoiceNumber: dto.invoiceNumber,
      }),
      ...(dto.invoiceDate !== undefined && {
        invoiceDate: new Date(dto.invoiceDate),
      }),
      ...(dto.currency !== undefined && {
        currency: dto.currency,
      }),
      ...(dto.totalAmount !== undefined && {
        totalAmount: dto.totalAmount,
      }),

      ...(dto.jurisdiction !== undefined && {
        jurisdiction: dto.jurisdiction,
      }),
      ...(dto.invoiceTypeCode !== undefined && {
        invoiceTypeCode: dto.invoiceTypeCode,
      }),
      ...(dto.transactionTypeCode !== undefined && {
        transactionTypeCode: dto.transactionTypeCode,
      }),
      ...(dto.paymentDueDate !== undefined && {
        paymentDueDate: new Date(dto.paymentDueDate),
      }),
      ...(dto.businessProcessType !== undefined && {
        businessProcessType: dto.businessProcessType,
      }),
      ...(dto.specificationIdentifier !== undefined && {
        specificationIdentifier: dto.specificationIdentifier,
      }),
      ...(dto.paymentMeansTypeCode !== undefined && {
        paymentMeansTypeCode: dto.paymentMeansTypeCode,
      }),
      ...(dto.paymentAccountIdentifier !== undefined && {
        paymentAccountIdentifier: dto.paymentAccountIdentifier,
      }),

      ...(dto.creditNoteReasonCode !== undefined && {
        creditNoteReasonCode: dto.creditNoteReasonCode,
      }),
      ...(dto.creditNoteReasonText !== undefined && {
        creditNoteReasonText: dto.creditNoteReasonText,
      }),
      ...(dto.precedingInvoiceReference !== undefined && {
        precedingInvoiceReference: dto.precedingInvoiceReference,
      }),

      ...(dto.lineNetTotal !== undefined && {
        lineNetTotal: dto.lineNetTotal,
      }),
      ...(dto.allowanceTotal !== undefined && {
        allowanceTotal: dto.allowanceTotal,
      }),
      ...(dto.chargeTotal !== undefined && {
        chargeTotal: dto.chargeTotal,
      }),
      ...(dto.totalWithoutTax !== undefined && {
        totalWithoutTax: dto.totalWithoutTax,
      }),
      ...(dto.totalTaxAmount !== undefined && {
        totalTaxAmount: dto.totalTaxAmount,
      }),
      ...(dto.totalWithTax !== undefined && {
        totalWithTax: dto.totalWithTax,
      }),
      ...(dto.paidAmount !== undefined && {
        paidAmount: dto.paidAmount,
      }),
      ...(dto.roundingAmount !== undefined && {
        roundingAmount: dto.roundingAmount,
      }),
      ...(dto.amountDue !== undefined && {
        amountDue: dto.amountDue,
      }),

      status: 'RECEIVED',
      complianceStatus: 'PENDING',
    };

    return this.prisma.$transaction(async (tx) => {
      if (dto.parties !== undefined) {
        await tx.invoiceParty.deleteMany({
          where: {
            invoiceId: id,
          },
        });

        if (dto.parties.length > 0) {
          await tx.invoiceParty.createMany({
            data: dto.parties.map((party) => ({
              invoiceId: id,
              role: party.role,
              name: party.name,
              electronicAddress: party.electronicAddress,
              electronicIdentifier: party.electronicIdentifier,
              legalRegistrationIdentifier:
                party.legalRegistrationIdentifier,
              legalRegistrationIdentifierType:
                party.legalRegistrationIdentifierType,
              legalRegistrationAuthorityName:
                party.legalRegistrationAuthorityName,
              taxIdentifier: party.taxIdentifier,
              taxSchemeCode: party.taxSchemeCode,
              addressLine1: party.addressLine1,
              city: party.city,
              countrySubdivision: party.countrySubdivision,
              countryCode: party.countryCode,
            })),
          });
        }
      }

      if (dto.lines !== undefined) {
        await tx.invoiceLine.deleteMany({
          where: {
            invoiceId: id,
          },
        });

        if (dto.lines.length > 0) {
          await tx.invoiceLine.createMany({
            data: dto.lines.map((line) => ({
              invoiceId: id,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              taxAmount: line.taxAmount,
              lineTotal: line.lineTotal,
              lineIdentifier: line.lineIdentifier,
              unitOfMeasureCode: line.unitOfMeasureCode,
              lineNetAmount: line.lineNetAmount,
              itemNetPrice: line.itemNetPrice,
              itemGrossPrice: line.itemGrossPrice,
              priceBaseQuantity: line.priceBaseQuantity,
              taxCategoryCode: line.taxCategoryCode,
              taxRate: line.taxRate,
              vatExemptionReasonCode: line.vatExemptionReasonCode,
              vatExemptionReasonText: line.vatExemptionReasonText,
              vatLineAmountAED: line.vatLineAmountAED,
              lineAmountAED: line.lineAmountAED,
              itemName: line.itemName,
            })),
          });
        }
      }

      if (dto.taxBreakdowns !== undefined) {
        await tx.invoiceTaxBreakdown.deleteMany({
          where: {
            invoiceId: id,
          },
        });

        if (dto.taxBreakdowns.length > 0) {
          await tx.invoiceTaxBreakdown.createMany({
            data: dto.taxBreakdowns.map((tax) => ({
              invoiceId: id,
              taxableAmount: tax.taxableAmount,
              taxAmount: tax.taxAmount,
              categoryCode: tax.categoryCode,
              taxRate: tax.taxRate,
              vatExemptionReasonCode: tax.vatExemptionReasonCode,
              vatExemptionReasonText: tax.vatExemptionReasonText,
            })),
          });
        }
      }
      const updatedInvoice = await tx.invoice.update({
        where: {
          id,
        },
        data,
        include: {
          lines: true,
          documents: true,
          parties: true,
          taxBreakdowns: true,
        },
      });

      await tx.invoiceAuditEvent.create({
        data: {
          invoiceId: id,
          tenantId,
          userId,
          action: 'REMEDIATION_UPDATED',
          fromStatus: existing.status,
          toStatus: 'RECEIVED',
          details: {
            previousComplianceStatus: existing.complianceStatus,
            complianceStatus: 'PENDING',
            remediatedFields: Object.keys(data).filter(
              (field) =>
                field !== 'status' &&
                field !== 'complianceStatus',
            ),
          },
        },
      });

      return updatedInvoice;
    });
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAuditHistory(id: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.prisma.invoiceAuditEvent.findMany({
      where: {
        invoiceId: id,
        tenantId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findOne(id: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        lines: true,
        documents: true,
        parties: true,
        taxBreakdowns: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }
}
