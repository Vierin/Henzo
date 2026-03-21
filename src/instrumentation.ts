/**
 * Next.js instrumentation hook — loads Sentry for Node and Edge runtimes.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 */
import * as Sentry from '@sentry/nextjs';

export async function register() {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		await import('../sentry.server.config');
	}

	if (process.env.NEXT_RUNTIME === 'edge') {
		await import('../sentry.edge.config');
	}
}

/** RSC / middleware / proxy request errors (Next.js 15 + @sentry/nextjs ≥ 8.28). */
export const onRequestError = Sentry.captureRequestError;
