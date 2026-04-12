'use client';

import { useTranslation } from '@/contexts/LanguageContext';
import { Check } from 'lucide-react';
import {
	SAVE_ANNUAL_PERCENT,
	SUBSCRIPTION_FEATURE_KEYS,
} from '@/config/subscriptionPlans';

/**
 * Loading UI aligned with the unpaid plan card layout: real title/subtitle and
 * static copy; pulse only where amounts / CTA depend on loaded subscription.
 */
export default function SubscriptionPageSkeleton() {
	const t = useTranslation();

	return (
		<div className="min-h-screen bg-[#F0F4F8] relative overflow-hidden">
			<main className="container mx-auto px-4 py-6 max-w-5xl relative z-0">
				<header className="text-center mb-6">
					<h1 className="text-3xl md:text-4xl font-bold !mb-2 text-gray-900 tracking-tight">
						{t('owner.subscription.title')}
					</h1>
					<p className="text-gray-500 text-lg font-medium">
						{t('owner.subscription.subtitle')}
					</p>
				</header>

				<div className="max-w-lg mx-auto">
					<div className="flex justify-center mb-0">
						<div
							className="inline-flex p-2 rounded-xl bg-gray-100 border border-gray-200 pointer-events-none select-none"
							aria-hidden
						>
							<span className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-white text-[#ff5b5b] shadow-sm">
								{t('owner.subscription.monthly')}
							</span>
							<span className="px-5 py-2.5 rounded-xl font-semibold text-sm text-gray-800 flex items-center gap-2">
								{t('owner.subscription.annual')}
								<span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[#ff5b5b]/90 text-white">
									{t('owner.subscription.savePercent').replace(
										'{{percent}}',
										String(SAVE_ANNUAL_PERCENT)
									)}
								</span>
							</span>
						</div>
					</div>

					<div className="flex justify-center mt-6 -mb-4 relative z-10">
						<span className="px-4 py-1.5 rounded-full bg-[#ff5b5b] text-white text-xs font-bold uppercase">
							{t('owner.subscription.mostPopular')}
						</span>
					</div>

					<div className="relative bg-white border border-[#ea4b4b]/80 shadow-md rounded-2xl px-8 pt-8 pb-8">
						<h3 className="text-3xl font-bold text-gray-900 text-center mb-1">
							{t('owner.subscription.planName')}
						</h3>
						<p className="text-gray-500 text-sm text-center mb-3">
							{t('owner.subscription.planTagline')}
						</p>

						<div
							className="h-12 max-w-[14rem] mx-auto bg-gray-200/90 rounded-lg animate-pulse mb-3"
							aria-hidden
						/>

						<ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 mb-6">
							{SUBSCRIPTION_FEATURE_KEYS.map((key) => (
								<li key={key} className="flex items-start gap-2">
									<Check className="w-5 h-5 flex-shrink-0 text-[#ff5b5b] mt-0.5" />
									<span className="text-gray-700 text-sm">{t(key)}</span>
								</li>
							))}
						</ul>

						<div
							className="h-12 w-full bg-gray-200/90 rounded-xl animate-pulse"
							aria-hidden
						/>
						<p className="text-gray-400 text-xs text-center mt-4">
							{t('owner.subscription.noLongTermContracts')}
						</p>
					</div>
				</div>
			</main>
		</div>
	);
}
