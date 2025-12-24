/**
 * Unified storage utilities for sessionStorage and localStorage
 */

class Storage {
	constructor(private storage: globalThis.Storage) {}

	getItem<T = string>(key: string): T | null {
		try {
			const item = this.storage.getItem(key);
			if (item === null) return null;
			return JSON.parse(item) as T;
		} catch (error) {
			// If parsing fails, return raw string
			return this.storage.getItem(key) as T | null;
		}
	}

	setItem<T = string>(key: string, value: T): void {
		try {
			const serialized = typeof value === 'string' ? value : JSON.stringify(value);
			this.storage.setItem(key, serialized);
		} catch (error) {
			console.error(`Error storing ${key}:`, error);
		}
	}

	removeItem(key: string): void {
		this.storage.removeItem(key);
	}

	clear(): void {
		this.storage.clear();
	}

	key(index: number): string | null {
		return this.storage.key(index);
	}

	get length(): number {
		return this.storage.length;
	}
}

export const sessionStorage = new Storage(
	typeof window !== 'undefined' ? window.sessionStorage : ({} as Storage)
);

export const localStorage = new Storage(
	typeof window !== 'undefined' ? window.localStorage : ({} as Storage)
);

// Unified storage object for backward compatibility
// Note: getItem returns raw string (not parsed) to match usage in auth-unified.ts
export const storage = {
	setItem: <T = string>(key: string, value: T): void => {
		localStorage.setItem(key, value);
	},
	getItem: (key: string): string | null => {
		// Return raw string from localStorage (not parsed) since auth-unified.ts does JSON.parse
		if (typeof window === 'undefined') return null;
		try {
			return window.localStorage.getItem(key);
		} catch (e) {
			return null;
		}
	},
	removeItem: (key: string): void => {
		localStorage.removeItem(key);
	},
	session: {
		setItem: <T = string>(key: string, value: T): void => {
			sessionStorage.setItem(key, value);
		},
		getItem: (key: string): string | null => {
			// Return raw string from sessionStorage (not parsed) since auth-unified.ts does JSON.parse
			if (typeof window === 'undefined') return null;
			try {
				return window.sessionStorage.getItem(key);
			} catch (e) {
				return null;
			}
		},
		removeItem: (key: string): void => {
			sessionStorage.removeItem(key);
		},
	},
};
