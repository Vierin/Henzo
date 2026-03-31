import { extractLocaleFromPath, isLocale, type Locale } from './routing';

export function localizedPath(pathname: string, locale: Locale) {
	const parts = pathname.split('/');
	if (isLocale(parts[1])) {
		parts[1] = locale;
		return parts.join('/') || '/';
	}
	return `/${locale}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

export { extractLocaleFromPath };
