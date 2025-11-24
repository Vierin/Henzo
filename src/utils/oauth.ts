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
