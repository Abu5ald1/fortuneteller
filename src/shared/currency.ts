export const CURRENCY_CODES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CHF',
  'CNY',
  'CAD',
  'AUD',
  'INR',
  'EGP',
  'SAR',
  'AED',
] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];
