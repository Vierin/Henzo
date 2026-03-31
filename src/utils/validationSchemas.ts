/**
 * Common validation schemas and utilities
 */

export interface ValidationResult {
	isValid: boolean;
	errors: Record<string, string>;
}

export const validationSchemas = {
	email: (email: string): string | null => {
		if (!email) return 'Email is required';
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) return 'Invalid email format';
		return null;
	},

	password: (password: string, minLength: number = 6): string | null => {
		if (!password) return 'Password is required';
		if (password.length < minLength) {
			return `Password must be at least ${minLength} characters`;
		}
		return null;
	},

	required: (value: string, fieldName: string = 'This field'): string | null => {
		if (!value || value.trim() === '') {
			return `${fieldName} is required`;
		}
		return null;
	},

	phone: (phone: string): string | null => {
		if (!phone) return 'Phone number is required';
		// Basic phone validation - adjust regex based on your requirements
		const phoneRegex = /^[\d\s\-\+\(\)]+$/;
		if (!phoneRegex.test(phone)) return 'Invalid phone number format';
		return null;
	},

	url: (url: string): string | null => {
		if (!url) return null; // URL is optional in most cases
		try {
			new URL(url);
			return null;
		} catch {
			return 'Invalid URL format';
		}
	},

	minLength: (value: string, min: number, fieldName: string = 'This field'): string | null => {
		if (value && value.length < min) {
			return `${fieldName} must be at least ${min} characters`;
		}
		return null;
	},

	maxLength: (value: string, max: number, fieldName: string = 'This field'): string | null => {
		if (value && value.length > max) {
			return `${fieldName} must be no more than ${max} characters`;
		}
		return null;
	},
};

export function validateForm<T extends Record<string, any>>(
	data: T,
	rules: Record<keyof T, Array<(value: any) => string | null>>
): ValidationResult {
	const errors: Record<string, string> = {};

	for (const [field, fieldRules] of Object.entries(rules)) {
		const value = data[field as keyof T];
		for (const rule of fieldRules) {
			const error = rule(value);
			if (error) {
				errors[field] = error;
				break; // Stop at first error for this field
			}
		}
	}

	return {
		isValid: Object.keys(errors).length === 0,
		errors,
	};
}

