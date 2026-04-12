export type ClientEmailLocale = 'en' | 'ru' | 'vi';

export function resolveClientEmailLocale(locale?: string): ClientEmailLocale {
  return locale === 'ru' || locale === 'vi' ? locale : 'en';
}
