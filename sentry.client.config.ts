import * as Sentry from '@sentry/nextjs';

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	
	// Set tracesSampleRate to 1.0 to capture 100% of the transactions for tracing.
	// We recommend adjusting this value in production
	tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
	
	// Set sample rate for profiling
	profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

	// Adjust this value in production, or use tracesSampler for greater control
	debug: false,

	// Replay may only be enabled for the client-side
	integrations: [
		Sentry.replayIntegration({
			// Set sample rate to 0.1 for production (10% of sessions)
			sessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
			// Set sample rate to 1.0 for error sessions (100% of error sessions)
			errorSampleRate: 1.0,
		}),
	],

	// Only send errors to Sentry in production
	enabled: process.env.NODE_ENV === 'production' && !!process.env.NEXT_PUBLIC_SENTRY_DSN,

	// Filter out some common noise
	ignoreErrors: [
		// Network errors that are usually not actionable
		'NetworkError',
		'Failed to fetch',
		'Network request failed',
		// Browser extensions
		'Non-Error promise rejection captured',
	],
});

