/**
 * Logger utility that automatically filters console.log in production
 * while keeping error logs always visible
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
	log: (...args: unknown[]) => {
		if (isDev) {
			console.log(...args);
		}
	},
	error: (...args: unknown[]) => {
		// Always log errors, even in production
		console.error(...args);
	},
	warn: (...args: unknown[]) => {
		if (isDev) {
			console.warn(...args);
		}
	},
	info: (...args: unknown[]) => {
		if (isDev) {
			console.info(...args);
		}
	},
	debug: (...args: unknown[]) => {
		if (isDev) {
			console.debug(...args);
		}
	},
	// Group methods for better organization in dev
	group: (label: string) => {
		if (isDev) {
			console.group(label);
		}
	},
	groupEnd: () => {
		if (isDev) {
			console.groupEnd();
		}
	},
	table: (data: unknown) => {
		if (isDev) {
			console.table(data);
		}
	},
};

