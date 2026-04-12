'use client';

import { useState, useEffect } from 'react';

/**
 * Subscribes to a CSS media query (e.g. `(min-width: 768px)`).
 * Initial render uses `false` until mounted to avoid SSR mismatch.
 */
export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const mql = window.matchMedia(query);
		const update = () => setMatches(mql.matches);
		update();
		mql.addEventListener('change', update);
		return () => mql.removeEventListener('change', update);
	}, [query]);

	return matches;
}
