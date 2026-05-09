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
	// In development, these are optional (have defaults in code)
	// In production, they should be set
	const isDevelopment = process.env.NODE_ENV !== 'production';
	
	requiredEnvVars.forEach((varName) => {
		const value = process.env[varName];
		if (!value || value.trim() === '') {
			if (isDevelopment) {
				// In development, just warn (code has defaults)
				warnings.push(
					`${varName} is not set. Using default value. Set it in .env for production.`
				);
			} else {
				// In production, this is an error
				errors.push(`${varName} is required but not set`);
			}
		} else if (varName === 'NEXT_PUBLIC_API_URL' && value === 'http://localhost:3001') {
			if (!isDevelopment) {
				warnings.push(
					`${varName} is set to localhost. This should be changed to production URL in production environment.`
				);
			}
		} else if (
			varName === 'NEXT_PUBLIC_FRONTEND_URL' &&
			value === 'http://localhost:3000'
		) {
			if (!isDevelopment) {
				warnings.push(
					`${varName} is set to localhost. This should be changed to production URL in production environment.`
				);
			}
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

	// Avoid noisy console logs in production bundles.
	if (isDevelopment) {
		if (errors.length > 0) {
			console.error('❌ Environment variable validation errors:', errors);
			errors.forEach((error) => {
				console.error(`  - ${error}`);
			});
		}

		if (warnings.length > 0) {
			console.debug('ℹ️ Environment variable validation info:', warnings);
		}
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
		// Keep silent in production; validation result can be handled by callers if needed.
	}
}

