export const STUDIO_CURRENCIES = ['EUR', 'PLN', 'USD', 'VND'] as const;
export type StudioCurrencyCode = (typeof STUDIO_CURRENCIES)[number];

export function isStudioCurrency(value: unknown): value is StudioCurrencyCode {
  return (
    typeof value === 'string' &&
    (STUDIO_CURRENCIES as readonly string[]).includes(value)
  );
}

/** Default for new studios when client omits currency. */
export function resolveCreateStudioCurrency(
  currency?: string | null,
): StudioCurrencyCode {
  if (isStudioCurrency(currency)) return currency;
  return 'EUR';
}
