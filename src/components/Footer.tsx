'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { withLocale } from '@/i18n/routing';

export default function Footer() {
	const params = useParams();
	const locale = (params as any)?.locale as string | undefined;
	const t = useTranslation();

	return (
		<footer className="bg-[#F8F5F2] pt-6 md:py-12 md:px-6 px-4 border-t border-gray-200">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex md:flex-col gap-5 md:gap-0 flex-col-reverse md:flex-row justify-between items-start md:items-center">
					<div className="mb-4 md:mb-0">
						<p className="text-gray-400">{t.footer.allRightsReserved}</p>
					</div>
					<div className="flex md:flex-row flex-col justify-start gap-2 md:gap-0 space-x-6">
						<Link
							href={withLocale(
								'/about',
								(locale as 'en' | 'ru' | 'vi') || 'en'
							)}
							className="text-gray-700 hover:text-[#8B4513]"
						>
							{t.footer.aboutUs}
						</Link>
						<Link
							href={withLocale(
								'/contact',
								(locale as 'en' | 'ru' | 'vi') || 'en'
							)}
							className="text-gray-700 hover:text-[#8B4513]"
						>
							{t.footer.contact}
						</Link>
						<Link
							href={withLocale(
								'/terms-of-service',
								(locale as 'en' | 'ru' | 'vi') || 'en'
							)}
							className="text-gray-700 hover:text-[#8B4513]"
						>
							{t.footer.termsOfService}
						</Link>
						<Link
							href={withLocale(
								'/privacy-policy',
								(locale as 'en' | 'ru' | 'vi') || 'en'
							)}
							className="text-gray-700 hover:text-[#8B4513]"
						>
							{t.footer.privacyPolicy}
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
}
