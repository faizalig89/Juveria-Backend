/**
 * UAE PINT-AE code-list registry.
 *
 * Architecture:
 * Regulatory code-list data is kept separate from validation logic.
 *
 * IMPORTANT:
 * The value sets below currently contain only the values required by
 * the verified Adescare UAE test scenario. They are NOT yet complete
 * copies of the authoritative external code lists.
 *
 * The registry will be expanded from the authoritative PINT-AE
 * referenced code lists before production enforcement.
 */

export const PINT_AE_CODE_LIST_METADATA = {
  profile: 'PINT-AE',
  pdkVersion: '1.4.4',
  pdkReleaseDate: '2026-07-29',

  families: {
    vatCategory: 'AETaxCat',
    country: 'ISO3166-1:Alpha2',
    currency: 'ISO4217',
    invoiceType: 'UNCL1001',
    paymentMeans: 'UNCL4461',
    unitOfMeasure: 'UNECERec20',
    transactionType: 'AE-TransType',
  },
} as const;

/*
 * Current verified test-profile values.
 *
 * These sets intentionally remain narrow until the complete
 * authoritative lists are incorporated and regression-tested.
 */

export const PINT_AE_INVOICE_TYPE_CODES =
  new Set<string>([
    '380',
    '381',
  ]);

export const PINT_AE_CURRENCY_CODES =
  new Set<string>([
    'AED',
  ]);

export const PINT_AE_PAYMENT_MEANS_CODES =
  new Set<string>([
    '30',
  ]);

export const PINT_AE_COUNTRY_CODES =
  new Set<string>([
    'AE',
  ]);

export const PINT_AE_VAT_CATEGORY_CODES =
  new Set<string>([
    'S',
    'E',
    'O',
    'AE',
    'Z',
    'N',
  ]);

export const PINT_AE_UNIT_CODES =
  new Set<string>([
    'C62',
  ]);