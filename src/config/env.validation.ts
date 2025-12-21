/**
 * Environment variables validation
 * Validates critical environment variables at startup
 */

const requiredEnvVars = [
	'NEXT_PUBLIC_API_URL',
	'NEXT_PUBLIC_FRONTEND_URL',
] as const;

const optionalEnvVars = [
	'NEXT_PUBLIC_SUPABASE_URL',
	'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

interface EnvValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

/**
 * Validates environment variables
 * Should be called on client-side only
 */
export function validateEnv(): EnvValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Only validate on client side
	if (typeof window === 'undefined') {
		return { valid: true, errors: [], warnings: [] };
	}

	// Check required variables
	requiredEnvVars.forEach((varName) => {
		const value = process.env[varName];
		if (!value || value.trim() === '') {
			errors.push(`${varName} is required but not set`);
		} else if (varName === 'NEXT_PUBLIC_API_URL' && value === 'http://localhost:3001') {
			warnings.push(
				`${varName} is set to localhost. This should be changed to production URL in production environment.`
			);
		} else if (
			varName === 'NEXT_PUBLIC_FRONTEND_URL' &&
			value === 'http://localhost:3000'
		) {
			warnings.push(
				`${varName} is set to localhost. This should be changed to production URL in production environment.`
			);
		}
	});

	// Check optional variables (warn if missing in production)
	if (process.env.NODE_ENV === 'production') {
		optionalEnvVars.forEach((varName) => {
			const value = process.env[varName];
			if (!value || value.trim() === '') {
				warnings.push(`${varName} is not set. Some features may not work correctly.`);
			}
		});
	}

	// Log errors and warnings
	if (errors.length > 0) {
		console.error('❌ Environment variable validation errors:', errors);
		errors.forEach((error) => {
			console.error(`  - ${error}`);
		});
	}

	if (warnings.length > 0 && process.env.NODE_ENV === 'production') {
		console.warn('⚠️ Environment variable validation warnings:', warnings);
		warnings.forEach((warning) => {
			console.warn(`  - ${warning}`);
		});
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Initialize environment validation on client side
 * Call this once at app startup
 */
export function initEnvValidation(): void {
	if (typeof window === 'undefined') return;

	const result = validateEnv();

	if (!result.valid) {
		// In development, we can continue, but log errors
		// In production, this should be fixed before deployment
		if (process.env.NODE_ENV === 'production') {
			console.error(
				'🚨 Critical environment variables are missing. The application may not work correctly.'
			);
		}
	}
}

