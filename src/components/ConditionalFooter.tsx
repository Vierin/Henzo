'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function ConditionalFooter() {
	const pathname = usePathname();

	// Hide footer on map page
	if (pathname === '/map') {
		return null;
	}

	return <Footer />;
}
