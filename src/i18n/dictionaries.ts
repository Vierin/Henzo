import 'server-only';
import type { Locale } from './routing';
import { loadModules, type TranslationModule } from './modules';

// Base modules that are always loaded for server components
const BASE_MODULES: TranslationModule[] = [
	'core/common',
	'core/meta',
	'core/navigation',
	'core/weekdays',
	'core/months',
	'ui/header',
	'ui/footer',
	'ui/cookieBanner',
	'shared/forms',
	'shared/emptyStates',
];

/**
 * Get dictionary for server components
 * @param locale - The locale to load
 * @param modules - Optional array of modules to load. If not provided, loads base modules only.
 */
export async function getDictionary(
	locale: Locale,
	modules?: TranslationModule[]
): Promise<any> {
	const modulesToLoad = modules ? [...BASE_MODULES, ...modules] : BASE_MODULES;
	return await loadModules(locale, modulesToLoad);
}
