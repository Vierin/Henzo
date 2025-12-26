'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Footer from './Footer';

export default function ConditionalFooter() {
	const pathname = usePathname();
	const [isLoading, setIsLoading] = useState(true);

	// Track page loading state
	useEffect(() => {
		// Set loading to false when pathname changes (page navigation)
		setIsLoading(true);
		
		// Wait for page to load
		const handleLoad = () => {
			setIsLoading(false);
		};

		// If page is already loaded
		if (document.readyState === 'complete') {
			setIsLoading(false);
		} else {
			window.addEventListener('load', handleLoad);
		}

		// Also set loading to false after a short delay to handle client-side navigation
		const timer = setTimeout(() => {
			setIsLoading(false);
		}, 100);

		return () => {
			window.removeEventListener('load', handleLoad);
			clearTimeout(timer);
		};
	}, [pathname]);

	// Hide footer on map page
	if (pathname === '/map') {
		return null;
	}

	// Hide footer during page loading
	if (isLoading) {
		return null;
	}

	return <Footer />;
}
