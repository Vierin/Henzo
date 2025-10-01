'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import PublicHeader from '@/components/PublicHeader';

export default function PublicGroupLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const shouldShowSearch =
		pathname.startsWith('/category/') ||
		pathname.startsWith('/salons') ||
		pathname.startsWith('/salon/');
	const [isScrolled, setIsScrolled] = useState(false);

	// Handle scroll to determine if search is fixed
	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 50);
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	return (
		<div className="min-h-screen bg-[#fff7f6]">
			<PublicHeader />
			<main className={shouldShowSearch && isScrolled ? 'pt-20' : ''}>
				{children}
			</main>
		</div>
	);
}
