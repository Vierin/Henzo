import { supabase } from '@/lib/supabase';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';

/**
 * Determines the correct OAuth redirect URL for web frontend
 * Always uses HTTP/HTTPS URL (never henzo:// scheme)
 *
 * Note: henzo:// is only used in the mobile React Native app,
 * not in the web frontend. This function ensures we always use
 * proper HTTP/HTTPS URLs for web OAuth callbacks.
 */
export function getOAuthRedirectUrl(path: string = '/auth/callback'): string {
	// For web frontend, always use HTTP/HTTPS URL
	const frontendUrl = (
		process.env.NEXT_PUBLIC_FRONTEND_URL ||
		(typeof window !== 'undefined'
			? window.location.origin
			: 'https://henzo.app')
	).trim();

	// Remove any custom schemes (henzo://) and ensure HTTP/HTTPS
	let cleanUrl = frontendUrl;
	if (cleanUrl.startsWith('henzo://')) {
		cleanUrl = cleanUrl.replace('henzo://', 'https://');
	}

	// Ensure it's a valid HTTP/HTTPS URL
	if (!cleanUrl.match(/^https?:\/\//)) {
		cleanUrl = `https://${cleanUrl}`;
	}

	return `${cleanUrl}${path}`;
}

export const BUSINESS_OAUTH_NONCE_KEY = 'businessOAuthNonce';
export const BUSINESS_OAUTH_NONCE_TS_KEY = 'businessOAuthNonceTs';
export const BUSINESS_OAUTH_SOURCE_KEY = 'businessOAuthSource';

const BUSINESS_OAUTH_TTL_MS = 15 * 60 * 1000;

function trackBusinessEvent(
	eventName: string,
	params?: Record<string, unknown>
) {
	if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
		window.gtag('event', eventName, params);
	}
}

function createBusinessOAuthNonce(): string {
	if (
		typeof crypto !== 'undefined' &&
		typeof crypto.randomUUID === 'function'
	) {
		return crypto.randomUUID();
	}
	return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Starts Google OAuth for business onboarding only. Sets nonce+TTL; callback requires
 * `type=business` + valid nonce so normal login OAuth never runs this path.
 * Magic-link token is not used — Google verifies email; backend register uses session userId only.
 */
export async function startBusinessGoogleOAuth(options?: {
	source?: 'business_beta_form' | 'business_register';
}) {
	const source = options?.source ?? 'business_register';
	const nonce = createBusinessOAuthNonce();

	sessionStorage.setItem(BUSINESS_OAUTH_NONCE_KEY, nonce);
	sessionStorage.setItem(BUSINESS_OAUTH_NONCE_TS_KEY, String(Date.now()));
	sessionStorage.setItem(BUSINESS_OAUTH_SOURCE_KEY, source);

	trackBusinessEvent('business_google_click', { source });

	const currentPath =
		typeof window !== 'undefined' ? window.location.pathname : '/';
	const locale = extractLocaleFromPath(currentPath) ?? 'en';
	const callbackPath = withLocale('/auth/callback?type=business', locale);
	const redirectUrl = getOAuthRedirectUrl(callbackPath);
	return supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: redirectUrl,
			queryParams: {
				access_type: 'offline',
				prompt: 'consent',
			},
		},
	});
}

export function consumeBusinessOAuthContext(): {
	isValid: boolean;
	source: string | null;
} {
	const source = sessionStorage.getItem(BUSINESS_OAUTH_SOURCE_KEY);
	const nonce = sessionStorage.getItem(BUSINESS_OAUTH_NONCE_KEY);
	const nonceTs = sessionStorage.getItem(BUSINESS_OAUTH_NONCE_TS_KEY);

	const createdAt = nonceTs ? Number(nonceTs) : 0;
	const isValid =
		!!nonce &&
		!!createdAt &&
		Number.isFinite(createdAt) &&
		Date.now() - createdAt <= BUSINESS_OAUTH_TTL_MS;

	sessionStorage.removeItem(BUSINESS_OAUTH_NONCE_KEY);
	sessionStorage.removeItem(BUSINESS_OAUTH_NONCE_TS_KEY);
	sessionStorage.removeItem(BUSINESS_OAUTH_SOURCE_KEY);
	// Legacy key from older business OAuth + magic-link experiments
	sessionStorage.removeItem('magicLinkToken');
	localStorage.removeItem('registrationType');
	sessionStorage.removeItem('registrationType');

	return { isValid, source };
}
