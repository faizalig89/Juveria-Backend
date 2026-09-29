import { JsonInvoiceMapperService } from './json-invoice-mapper.service.js';

describe('JsonInvoiceMapperService', () => {
  const mapper = new JsonInvoiceMapperService();

  it('maps a structured UAE invoice', () => {
    const result = mapper.map({
      invoiceNumber: 'JSON-TEST-001',
      invoiceDate: '2026-09-25',
      currency: 'AED',
      totalAmount: 1050,

      jurisdiction: 'AE',
      invoiceTypeCode: '380',
      transactionTypeCode: '00000000',

      lineNetTotal: 1000,
      totalWithoutTax: 1000,
      totalTaxAmount: 50,
      totalWithTax: 1050,
      amountDue: 1050,

      parties: [
        {
          role: 'SELLER',
          name: 'Test Seller LLC',
          countryCode: 'AE',
        },
        {
          role: 'BUYER',
          name: 'Test Buyer LLC',
          countryCode: 'AE',
        },
      ],

      taxBreakdowns: [
        {
          taxableAmount: 1000,
          taxAmount: 50,
          categoryCode: 'S',
          taxRate: 5,
        },
      ],

      lines: [
        {
          description: 'Consulting Services',
          quantity: 1,
          unitPrice: 1000,
          taxAmount: 50,
          lineTotal: 1050,
          lineNetAmount: 1000,
          taxCategoryCode: 'S',
          taxRate: 5,
        },
      ],
    });

    expect(result.source).toBe('JSON');
    expect(result.invoice.invoiceNumber)
      .toBe('JSON-TEST-001');

    expect(result.invoice.parties)
      .toHaveLength(2);

    expect(result.invoice.lines)
      .toHaveLength(1);

    expect(result.invoice.taxBreakdowns)
      .toHaveLength(1);

    expect(result.invoice.totalTaxAmount)
      .toBe(50);

    expect(result.warnings)
      .toHaveLength(0);
  });

  it('rejects an invoice without invoiceNumber', () => {
    expect(() =>
      mapper.map({
        invoiceDate: '2026-09-25',
        currency: 'AED',
        totalAmount: 1050,
      }),
    ).toThrow('invoiceNumber is required');
  });

  it('rejects an invalid party role', () => {
    expect(() =>
      mapper.map({
        invoiceNumber: 'JSON-TEST-002',
        invoiceDate: '2026-09-25',
        currency: 'AED',
        totalAmount: 100,
        parties: [
          {
            role: 'UNKNOWN',
          },
        ],
      }),
    ).toThrow(
      'parties[0].role must be SELLER or BUYER',
    );
  });

  it('normalizes lowercase currency to uppercase', () => {
    const result = mapper.map({
      invoiceNumber: 'STRICT-001',
      invoiceDate: '2026-09-25',
      currency: 'aed',
      totalAmount: 100,
    });

    expect(result.invoice.currency).toBe('AED');
  });

  it('rejects an impossible invoice date', () => {
    expect(() =>
      mapper.map({
        invoiceNumber: 'STRICT-002',
        invoiceDate: '2026-02-30',
        currency: 'AED',
        totalAmount: 100,
      }),
    ).toThrow(
      'invoiceDate must be a valid YYYY-MM-DD date',
    );
  });

  it('rejects malformed paymentDueDate', () => {
    expect(() =>
      mapper.map({
        invoiceNumber: 'STRICT-003',
        invoiceDate: '2026-09-25',
        paymentDueDate: '25/10/2026',
        currency: 'AED',
        totalAmount: 100,
      }),
    ).toThrow(
      'paymentDueDate must be a valid YYYY-MM-DD date',
    );
  });

  it('rejects malformed optional numeric values', () => {
    expect(() =>
      mapper.map({
        invoiceNumber: 'STRICT-004',
        invoiceDate: '2026-09-25',
        currency: 'AED',
        totalAmount: 100,
        totalTaxAmount: 'not-a-number',
      }),
    ).toThrow(
      'totalTaxAmount must be a number',
    );
  });

  it('preserves a valid optional zero amount', () => {
    const result = mapper.map({
      invoiceNumber: 'STRICT-005',
      invoiceDate: '2026-09-25',
      currency: 'AED',
      totalAmount: 100,
      allowanceTotal: 0,
    });

    expect(result.invoice.allowanceTotal)
      .toBe(0);
  });

  it('rejects malformed currency codes', () => {
    expect(() =>
      mapper.map({
        invoiceNumber: 'STRICT-006',
        invoiceDate: '2026-09-25',
        currency: 'AED1',
        totalAmount: 100,
      }),
    ).toThrow(
      'currency must be a 3-letter currency code',
    );
  });
});
