export const locales = ['en', 'ru', 'vi', 'cs', 'pl'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function extractLocaleFromPath(pathname: string): Locale | null {
  const seg = pathname.split('/')[1];
  return isLocale(seg) ? (seg as Locale) : null;
}

export function stripLocaleFromPath(pathname: string): string {
  const seg = pathname.split('/')[1];
  if (isLocale(seg)) {
    return pathname.split('/').slice(2).join('/')
      ? `/${pathname.split('/').slice(2).join('/')}`
      : '/';
  }
  return pathname;
}

export function withLocale(pathname: string, locale: Locale) {
  const stripped = stripLocaleFromPath(pathname);
  return `/${locale}${stripped}`;
}

/**
 * Full document navigation (not Next.js soft navigation).
 * After leaving owner/admin-style shells, client-side route transitions can leave
 * global CSS (e.g. Tailwind) out of sync; a hard navigation reloads styles reliably.
 */
export function hardNavigateToLocalePath(pathname: string, locale: Locale) {
  if (typeof window === 'undefined') return;
  const path = withLocale(pathname, locale);
  window.location.assign(`${window.location.origin}${path}`);
}
