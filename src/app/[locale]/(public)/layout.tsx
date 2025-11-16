'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import PublicHeader from '@/components/PublicHeader';
import { stripLocaleFromPath } from '@/i18n/routing';

export default function PublicGroupLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const pathWithoutLocale = useMemo(
		() => stripLocaleFromPath(pathname),
		[pathname]
	);
	const shouldShowSearch =
		pathWithoutLocale.startsWith('/category/') ||
		pathWithoutLocale.startsWith('/salons') ||
		pathWithoutLocale.startsWith('/salon/');
	const isBusinessPage = pathWithoutLocale === '/business';
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 50);
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	return (
		<div className={`min-h-screen ${!isBusinessPage ? 'bg-[#fff7f6]' : ''}`}>
			{!isBusinessPage && <PublicHeader />}
			<main className={shouldShowSearch && isScrolled ? 'pt-20' : ''}>
				{children}
			</main>
		</div>
	);
}
