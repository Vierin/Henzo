export const STUDIO_CURRENCIES = ['EUR', 'PLN', 'USD', 'VND'] as const;
export type StudioCurrency = (typeof STUDIO_CURRENCIES)[number];

const LOCALE_BY_CURRENCY: Record<StudioCurrency, string> = {
  EUR: 'es-ES',
  PLN: 'pl-PL',
  USD: 'en-US',
  VND: 'vi-VN',
};

export function isStudioCurrency(value: unknown): value is StudioCurrency {
  return (
    typeof value === 'string' &&
    (STUDIO_CURRENCIES as readonly string[]).includes(value)
  );
}

export function parseStudioCurrency(raw: unknown): StudioCurrency {
  const c = String(raw ?? '')
    .trim()
    .toUpperCase();
  return isStudioCurrency(c) ? c : 'EUR';
}

/** New studio default from UI locale (`pl` → PLN, else EUR). */
export function defaultCurrencyForLocale(locale: string): StudioCurrency {
  return locale === 'pl' ? 'PLN' : 'EUR';
}

export function formatMoney(
  amount: number,
  currency: StudioCurrency = 'EUR',
): string {
  if (!Number.isFinite(amount)) return '';
  const zeroDecimal = currency === 'VND';
  try {
    return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
      style: 'currency',
      currency,
      minimumFractionDigits: zeroDecimal ? 0 : 2,
      maximumFractionDigits: zeroDecimal ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** VND-style grouping for inputs: `400000` → `400.000` */
export function formatPriceDots(value: number | string): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parsePriceDots(value: string): number {
  const digits = value.replace(/\D/g, '');
  if (!digits) return 0;
  return Number(digits) || 0;
}

/** Format while typing in training price fields. */
export function formatPriceInput(
  raw: string,
  currency: StudioCurrency,
): string {
  if (currency === 'VND') return formatPriceDots(raw);
  let s = raw.replace(/[^\d.,]/g, '').replace(',', '.');
  const parts = s.split('.');
  if (parts.length > 2) {
    s = `${parts[0]}.${parts.slice(1).join('')}`;
  }
  return s;
}

export function parsePriceInput(raw: string, currency: StudioCurrency): number {
  if (currency === 'VND') return parsePriceDots(raw);
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(',', '.');
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function priceInputPlaceholder(currency: StudioCurrency): string {
  return currency === 'VND' ? '150.000' : '20.99';
}
