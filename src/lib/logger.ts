/**
 * Structured logging utility
 * Provides consistent logging across the application
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
	[key: string]: unknown;
}

class Logger {
	private isDevelopment = process.env.NODE_ENV === 'development';
	private isProduction = process.env.NODE_ENV === 'production';

	/**
	 * Generate request ID for tracing
	 * Works in both browser and Node.js environments
	 */
	generateRequestId(): string {
		if (typeof crypto !== 'undefined' && crypto.randomUUID) {
			return crypto.randomUUID();
		}
		// Fallback for environments without crypto.randomUUID
		return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
	}

	/**
	 * Format log message with context
	 */
	private formatMessage(
		level: LogLevel,
		message: string,
		context?: LogContext
	): string {
		const timestamp = new Date().toISOString();
		const contextStr = context ? ` ${JSON.stringify(context)}` : '';
		return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
	}

	/**
	 * Log debug message (only in development)
	 */
	debug(message: string, context?: LogContext): void {
		if (this.isDevelopment) {
			console.debug(this.formatMessage('debug', message, context));
		}
	}

	/**
	 * Log info message
	 */
	info(message: string, context?: LogContext): void {
		if (this.isDevelopment) {
			console.info(this.formatMessage('info', message, context));
		}
		// In production, send to monitoring service
		if (this.isProduction && context?.error) {
			// TODO: Send to Sentry/LogRocket
		}
	}

	/**
	 * Log warning message
	 */
	warn(message: string, context?: LogContext): void {
		console.warn(this.formatMessage('warn', message, context));
		// In production, send to monitoring service
		if (this.isProduction) {
			// TODO: Send to Sentry/LogRocket
		}
	}

	/**
	 * Log error message
	 */
	error(message: string, context?: LogContext): void {
		console.error(this.formatMessage('error', message, context));
		// In production, send to monitoring service
		if (this.isProduction) {
			// TODO: Send to Sentry/LogRocket
			// Example: Sentry.captureException(new Error(message), { extra: context });
		}
	}

	/**
	 * Middleware-specific logging
	 */
	middleware = {
		request: (path: string, requestId: string, context?: LogContext): void => {
			this.debug(`[Middleware] Request: ${path}`, {
				requestId,
				path,
				...context,
			});
		},
		authCheck: (
			path: string,
			hasUser: boolean,
			userRole: string | null,
			context?: LogContext
		): void => {
			this.debug(`[Middleware] Auth check: ${path}`, {
				hasUser,
				userRole,
				path,
				...context,
			});
		},
		accessGranted: (
			path: string,
			userRole: string,
			userId: string,
			context?: LogContext
		): void => {
			this.info(`[Middleware] Access granted: ${path}`, {
				path,
				userRole,
				userId,
				...context,
			});
		},
		accessDenied: (
			path: string,
			userRole: string | null,
			requiredRole: string,
			userId?: string,
			context?: LogContext
		): void => {
			this.warn(`[Middleware] Access denied: ${path}`, {
				path,
				userRole,
				requiredRole,
				userId,
				...context,
			});
		},
		redirect: (
			from: string,
			to: string,
			reason: string,
			context?: LogContext
		): void => {
			this.debug(`[Middleware] Redirect: ${from} -> ${to}`, {
				from,
				to,
				reason,
				...context,
			});
		},
		error: (error: Error, path: string, context?: LogContext): void => {
			this.error(`[Middleware] Error: ${error.message}`, {
				error: error.message,
				stack: error.stack,
				path,
				...context,
			});
		},
	};

	/**
	 * Auth-specific logging
	 */
	auth = {
		login: (email: string, success: boolean, context?: LogContext): void => {
			if (success) {
				this.info(`[Auth] Login successful: ${email}`, context);
			} else {
				this.warn(`[Auth] Login failed: ${email}`, context);
			}
		},
		logout: (userId: string, context?: LogContext): void => {
			this.info(`[Auth] Logout: ${userId}`, context);
		},
		register: (
			email: string,
			role: string,
			success: boolean,
			context?: LogContext
		): void => {
			if (success) {
				this.info(
					`[Auth] Registration successful: ${email} (${role})`,
					context
				);
			} else {
				this.warn(`[Auth] Registration failed: ${email}`, context);
			}
		},
		sessionRefresh: (
			userId: string,
			success: boolean,
			context?: LogContext
		): void => {
			if (success) {
				this.debug(`[Auth] Session refreshed: ${userId}`, context);
			} else {
				this.warn(`[Auth] Session refresh failed: ${userId}`, context);
			}
		},
		roleUpdate: (
			userId: string,
			oldRole: string | null,
			newRole: string,
			context?: LogContext
		): void => {
			this.info(`[Auth] Role updated: ${userId}`, {
				oldRole,
				newRole,
				userId,
				...context,
			});
		},
		error: (error: Error, operation: string, context?: LogContext): void => {
			this.error(`[Auth] Error in ${operation}: ${error.message}`, {
				error: error.message,
				stack: error.stack,
				operation,
				...context,
			});
		},
	};
}

export const logger = new Logger();
