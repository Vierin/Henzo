import type { Locale } from './routing';

// Define all available translation modules
export type TranslationModule =
	// Core modules (base, always loaded)
	| 'core/common'
	| 'core/meta'
	| 'core/navigation'
	| 'core/weekdays'
	| 'core/months'
	// UI components (global, used on all pages)
	| 'ui/header'
	| 'ui/footer'
	| 'ui/cookieBanner'
	// Shared modules (used across public and owner)
	| 'shared/forms'
	| 'shared/auth'
	| 'shared/emptyStates'
	// Public pages
	| 'public/homepage'
	| 'public/salon'
	| 'public/booking'
	| 'public/categories'
	| 'public/map'
	| 'public/business'
	| 'public/contact'
	| 'public/about'
	| 'public/notFound'
	// Owner panel
	| 'owner/dashboard'
	| 'owner/salonInfo'
	| 'owner/profileSettings'
	| 'owner/services'
	| 'owner/staff'
	| 'owner/calendar'
	| 'owner/marketing'
	| 'owner/staffNew'
	| 'owner/servicesNew'
	| 'owner/feedback'
	| 'owner/subscription'
	// Client modules
	| 'client/settings'
	| 'client/dashboard'
	| 'client/favorites'
	| 'client/reviews';

// Module dependencies - which modules should be loaded together
export const moduleDependencies: Record<TranslationModule, TranslationModule[]> = {
	// Core - independent
	'core/common': [],
	'core/meta': [],
	'core/navigation': [],
	'core/weekdays': [],
	'core/months': [],
	
	// UI - depend on core
	'ui/header': ['core/common', 'core/navigation'],
	'ui/footer': ['core/common'],
	'ui/cookieBanner': ['core/common'],
	
	// Shared - depend on core
	'shared/forms': ['core/common'],
	'shared/auth': ['core/common', 'shared/forms'],
	'shared/emptyStates': ['core/common'],
	
	// Public - depend on core, ui, shared
	'public/homepage': ['core/common', 'core/navigation', 'ui/header', 'ui/footer'],
	'public/salon': ['core/common', 'core/navigation', 'ui/header', 'ui/footer'],
	'public/booking': ['core/common', 'core/weekdays', 'core/months', 'shared/forms', 'ui/header', 'ui/footer'],
	'public/categories': ['core/common', 'ui/header', 'ui/footer'],
	'public/map': ['core/common', 'ui/header', 'ui/footer'],
	'public/business': ['core/common', 'core/navigation', 'ui/header', 'ui/footer'],
	'public/contact': ['core/common', 'shared/forms', 'ui/header', 'ui/footer'],
	'public/about': ['core/common', 'core/navigation', 'ui/header', 'ui/footer'],
	
	// Owner - depend on core, shared
	'owner/dashboard': ['core/common', 'shared/emptyStates'],
	'owner/salonInfo': ['core/common', 'shared/forms'],
	'owner/profileSettings': ['core/common', 'shared/forms'],
	'owner/services': ['core/common'],
	'owner/staff': ['core/common'],
	'owner/calendar': ['core/common', 'core/weekdays', 'core/months'],
	'owner/marketing': ['core/common'],
	'owner/staffNew': ['core/common', 'shared/forms'],
	'owner/servicesNew': ['core/common', 'shared/forms'],
	'owner/feedback': ['core/common', 'shared/forms'],
	'owner/subscription': ['core/common'],
	
	// Client - depend on core, shared
	'client/settings': ['core/common', 'shared/forms'],
	'client/dashboard': ['core/common'],
	'client/favorites': ['core/common'],
	'client/reviews': ['core/common'],
};

// Cache for loaded modules
const moduleCache = new Map<string, any>();

/**
 * Load a translation module dynamically
 */
export async function loadModule(
	locale: Locale,
	module: TranslationModule
): Promise<any> {
	const cacheKey = `${locale}:${module}`;

	// Check cache first
	if (moduleCache.has(cacheKey)) {
		return moduleCache.get(cacheKey);
	}

	try {
		// Load the module - support nested paths like 'core/common', 'ui/header', etc.
		const moduleData = await import(
			`./locales/${locale}/${module}.json`
		).then((m) => m.default);

		// Cache it
		moduleCache.set(cacheKey, moduleData);

		return moduleData;
	} catch (error) {
		console.warn(`Failed to load module ${module} for locale ${locale}:`, error);
		// Fallback to English if module doesn't exist
		if (locale !== 'en') {
			try {
				const fallback = await import(
					`./locales/en/${module}.json`
				).then((m) => m.default);
				moduleCache.set(`en:${module}`, fallback);
				return fallback;
			} catch {
				// If even English doesn't exist, return empty object
				return {};
			}
		}
		return {};
	}
}

/**
 * Load multiple modules and merge them
 */
export async function loadModules(
	locale: Locale,
	modules: TranslationModule[]
): Promise<any> {
	// Get all required modules including dependencies
	const requiredModules = new Set<TranslationModule>();
	
	for (const mod of modules) {
		requiredModules.add(mod);
		// Add dependencies
		const deps = moduleDependencies[mod] || [];
		for (const dep of deps) {
			requiredModules.add(dep);
		}
	}

	// Load all modules in parallel
	const modulePromises = Array.from(requiredModules).map((module) =>
		loadModule(locale, module).then((data) => ({ module, data }))
	);

	const loadedModules = await Promise.all(modulePromises);

	// Merge modules into a single object
	// For backward compatibility, we flatten the structure:
	// - core/common → common
	// - ui/header → header
	// - shared/forms → forms
	// - public/homepage → homepage
	// - owner/dashboard → owner.dashboard
	// - client/settings → clientSettings
	const merged: any = {};
	for (const { module: modName, data } of loadedModules) {
		const keys = modName.split('/');
		
		if (keys.length === 2) {
			const [namespace, moduleName] = keys;
			
			// Map namespaces to flat structure for backward compatibility
			if (namespace === 'core') {
				// core/common → common, core/meta → meta, etc.
				merged[moduleName] = data;
			} else if (namespace === 'ui') {
				// ui/header → header, ui/footer → footer, etc.
				merged[moduleName] = data;
			} else if (namespace === 'shared') {
				// shared/forms → forms, shared/auth → auth, etc.
				merged[moduleName] = data;
			} else if (namespace === 'public') {
				// public/homepage → homepage, public/salon → salon, etc.
				merged[moduleName] = data;
			} else if (namespace === 'owner') {
				// owner/dashboard → owner.dashboard, owner/salonInfo → owner.salonInfo, etc.
				if (!merged.owner) {
					merged.owner = {};
				}
				merged.owner[moduleName] = data;
			} else if (namespace === 'client') {
				// client/settings → clientSettings
				if (moduleName === 'settings') {
					merged.clientSettings = data;
				} else {
					if (!merged.client) {
						merged.client = {};
					}
					merged.client[moduleName] = data;
				}
			}
		} else if (keys.length === 1) {
			// Legacy single-level paths
			if (merged[keys[0]] && typeof merged[keys[0]] === 'object' && typeof data === 'object') {
				merged[keys[0]] = { ...merged[keys[0]], ...data };
			} else {
				merged[keys[0]] = data;
			}
		}
	}

	return merged;
}

/**
 * Clear module cache (useful for hot reloading in development)
 */
export function clearModuleCache() {
	moduleCache.clear();
}

