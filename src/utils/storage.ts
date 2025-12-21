/**
 * Safe localStorage and sessionStorage utilities with SSR support
 * Wraps storage access to prevent errors in SSR or private browsing mode
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

	// Session storage methods (for temporary sessions when "Remember me" is unchecked)
	session: {
		getItem: (key: string): string | null => {
			if (!isClient) return null;
			try {
				return sessionStorage.getItem(key);
			} catch (error) {
				console.warn('sessionStorage.getItem failed:', error);
				return null;
			}
		},

		setItem: (key: string, value: string): boolean => {
			if (!isClient) return false;
			try {
				sessionStorage.setItem(key, value);
				return true;
			} catch (error) {
				console.warn('sessionStorage.setItem failed:', error);
				return false;
			}
		},

		removeItem: (key: string): boolean => {
			if (!isClient) return false;
			try {
				sessionStorage.removeItem(key);
				return true;
			} catch (error) {
				console.warn('sessionStorage.removeItem failed:', error);
				return false;
			}
		},

		clear: (): boolean => {
			if (!isClient) return false;
			try {
				sessionStorage.clear();
				return true;
			} catch (error) {
				console.warn('sessionStorage.clear failed:', error);
				return false;
			}
		},
	},
};

