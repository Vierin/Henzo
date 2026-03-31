'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Root error boundary — required for reporting React render errors to Sentry in App Router.
 */
export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.captureException(error);
	}, [error]);

	return (
		<html lang="en">
			<body className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 p-6 font-sans text-gray-900">
				<h1 className="text-xl font-semibold">Something went wrong</h1>
				<button
					type="button"
					onClick={() => reset()}
					className="rounded-md bg-[#ff5b5b] px-4 py-2 text-sm font-medium text-white hover:bg-[#e04a4a]"
				>
					Try again
				</button>
			</body>
		</html>
	);
}
