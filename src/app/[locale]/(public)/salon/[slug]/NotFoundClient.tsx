'use client';

import Link from 'next/link';
import { useTranslation } from '@/contexts/LanguageContext';
import { withLocale, extractLocaleFromPath } from '@/i18n/routing';
import { usePathname } from 'next/navigation';

export default function NotFoundClient() {
	const t = useTranslation();
	const pathname = usePathname();
	const locale = extractLocaleFromPath(pathname) ?? 'en';

	return (
		<div className="min-h-screen bg-[#F8F5F2] flex items-center justify-center">
			<div className="text-center max-w-md mx-auto px-4">
				<div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
					<span className="text-4xl" role="img" aria-label="Salon not found">
						🏪
					</span>
				</div>
				<h1 className="text-3xl font-bold text-gray-900 mb-4">
					{t('salon.notFound') || 'Salon Not Found'}
				</h1>
				<p className="text-gray-600 mb-8">
					{t('salon.notFoundDescription') ||
						"The salon you're looking for doesn't exist or may have been removed."}
				</p>
				<div className="space-y-4">
					<Link
						href={withLocale('/', locale as 'en' | 'ru' | 'vi')}
						className="inline-block bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
					>
						{t('salon.goHome') || 'Go Home'}
					</Link>
					<div>
						<Link
							href={withLocale('/salons', locale as 'en' | 'ru' | 'vi')}
							className="text-[#ff5b5b] hover:text-[#e04a4a] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 rounded"
						>
							{t('salon.browseAllSalons')}
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}

