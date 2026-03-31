import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

interface ErrorHandlerOptions {
	showToast?: boolean;
	logError?: boolean;
	defaultMessage?: string;
}

export function useErrorHandler(options: ErrorHandlerOptions = {}) {
	const {
		showToast = true,
		logError = true,
		defaultMessage = 'An error occurred. Please try again.',
	} = options;

	const handleError = useCallback(
		(error: unknown, customMessage?: string) => {
			let errorMessage = defaultMessage;

			if (error instanceof Error) {
				errorMessage = error.message;
			} else if (typeof error === 'string') {
				errorMessage = error;
			} else if (error && typeof error === 'object' && 'message' in error) {
				errorMessage = String(error.message);
			}

			// Use custom message if provided
			if (customMessage) {
				errorMessage = customMessage;
			}

			// Improve user-friendly error messages
			if (errorMessage.includes('Failed to fetch') || errorMessage.includes('fetch failed')) {
				errorMessage = 'Unable to connect to the server. Please check your internet connection.';
			} else if (errorMessage.includes('timeout')) {
				errorMessage = 'Request timed out. Please try again.';
			} else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
				errorMessage = 'Your session has expired. Please log in again.';
			} else if (errorMessage.includes('404')) {
				errorMessage = 'The requested resource was not found.';
			} else if (errorMessage.includes('500') || errorMessage.includes('Server error')) {
				errorMessage = 'Server error. Please try again later.';
			}

			if (logError) {
				logger.error('Error handled:', error);
			}

			if (showToast) {
				toast.error(errorMessage);
			}

			return errorMessage;
		},
		[showToast, logError, defaultMessage]
	);

	return { handleError };
}

