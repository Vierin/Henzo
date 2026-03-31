'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useTranslation, useLanguage } from '@/contexts/LanguageContext';
import { withLocale } from '@/i18n/routing';
import { useOwnerLayout } from '@/contexts/OwnerLayoutContext';
import { useSalonSlug } from '@/hooks/useSalonSlug';

const SECTION_IDS = [
	'addService',
	'addStaff',
	'salonHours',
	'calendar',
	'walkIn',
	'bookingPage',
] as const;

type SectionId = (typeof SECTION_IDS)[number];

const INTERNAL_HREF: Partial<Record<SectionId, string>> = {
	addService: '/services/new',
	addStaff: '/staff/new',
	salonHours: '/salon-info',
	calendar: '/calendar',
	walkIn: '/calendar',
};

export default function OwnerHelpClient() {
	const t = useTranslation();
	const { language } = useLanguage();
	const [openId, setOpenId] = useState<SectionId | null>('addService');
	const { salonData } = useOwnerLayout();
	const { getSalonUrl } = useSalonSlug();

	const salonPreviewPath = salonData ? getSalonUrl(salonData) : null;

	const toggle = (id: SectionId) => {
		setOpenId((prev) => (prev === id ? null : id));
	};

	return (
		<div className="max-w-2xl mx-auto px-4 py-6 md:py-10 w-full">
			<h1 className="text-2xl font-semibold text-gray-900 mb-1">
				{t('owner.help.pageTitle')}
			</h1>
			<p className="text-sm text-gray-600 mb-8">
				{t('owner.help.pageSubtitle')}
			</p>

			<div className="space-y-2">
				{SECTION_IDS.map((id) => {
					const title = t(`owner.help.items.${id}.title`);
					const body = t(`owner.help.items.${id}.body`);
					const open = openId === id;
					const href = INTERNAL_HREF[id];
					const isBookingPage = id === 'bookingPage';

					return (
						<div
							key={id}
							className="border border-gray-200 rounded-lg bg-white overflow-hidden"
						>
							<button
								type="button"
								onClick={() => toggle(id)}
								className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
							>
								<span className="font-medium text-gray-900">{title}</span>
								<ChevronDown
									className={`h-5 w-5 text-gray-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
								/>
							</button>
							{open && (
								<div className="px-4 pb-4 pt-0 border-t border-gray-100">
									<p className="text-sm text-gray-600 leading-relaxed mt-3">
										{body}
									</p>
									<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
										{href ? (
											<Link
												href={withLocale(href, language)}
												className="inline-flex items-center gap-1 text-sm font-medium text-[#ff5b5b] hover:text-[#e04a4a]"
											>
												{t('owner.help.open')}
												<ChevronRight className="h-4 w-4" />
											</Link>
										) : null}
										{isBookingPage && salonPreviewPath ? (
											<Link
												href={withLocale(salonPreviewPath, language)}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex items-center gap-1 text-sm font-medium text-[#ff5b5b] hover:text-[#e04a4a]"
											>
												{t('owner.onboarding.viewPage')}
												<ExternalLink className="h-3.5 w-3.5" />
											</Link>
										) : null}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
