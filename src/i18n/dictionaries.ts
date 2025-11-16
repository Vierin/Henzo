import 'server-only';
import type { Locale } from './routing';

export async function getDictionary(locale: Locale) {
	switch (locale) {
		case 'en':
			return (await import('./locales/en.json')).default;
		case 'ru':
			return (await import('./locales/ru.json')).default;
		case 'vi':
			return (await import('./locales/vi.json')).default;
		default:
			return (await import('./locales/en.json')).default;
	}
}
