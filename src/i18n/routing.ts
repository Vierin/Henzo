export const locales = ['en', 'ru', 'vi'] as const;
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
