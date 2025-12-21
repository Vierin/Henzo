/**
 * Safe localStorage utilities with SSR support
 * Wraps localStorage access to prevent errors in SSR or private browsing mode
 */

const isClient = typeof window !== 'undefined';

export const storage = {
	getItem: (key: string): string | null => {
		if (!isClient) return null;
		try {
			return localStorage.getItem(key);
		} catch (error) {
			// Handle private browsing mode or storage quota exceeded
			console.warn('localStorage.getItem failed:', error);
			return null;
		}
	},

	setItem: (key: string, value: string): boolean => {
		if (!isClient) return false;
		try {
			localStorage.setItem(key, value);
			return true;
		} catch (error) {
			// Handle private browsing mode or storage quota exceeded
			console.warn('localStorage.setItem failed:', error);
			return false;
		}
	},

	removeItem: (key: string): boolean => {
		if (!isClient) return false;
		try {
			localStorage.removeItem(key);
			return true;
		} catch (error) {
			console.warn('localStorage.removeItem failed:', error);
			return false;
		}
	},

	clear: (): boolean => {
		if (!isClient) return false;
		try {
			localStorage.clear();
			return true;
		} catch (error) {
			console.warn('localStorage.clear failed:', error);
			return false;
		}
	},
};

