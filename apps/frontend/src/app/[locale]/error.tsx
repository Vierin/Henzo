'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Route error:', error);
    }
  }, [error]);

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 p-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Something went wrong
      </h2>
      <p className="text-sm text-gray-600 text-center max-w-md">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
