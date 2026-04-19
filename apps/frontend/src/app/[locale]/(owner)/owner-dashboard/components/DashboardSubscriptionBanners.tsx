'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { useOwnerSubscription } from '@/hooks/useOwnerSubscription';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { extractLocaleFromPath, withLocale } from '@/i18n/routing';
import {
	annualPriceAfterPercentOff,
	formatVnd,
	PRICE_ANNUAL_VND,
} from '@/config/subscriptionPlans';

const TRIAL_PROMO_MAX_DAYS = 30;

function daysUntil(date: Date): number {
	const now = new Date();
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	now.setHours(0, 0, 0, 0);
	return Math.ceil((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

export default function DashboardSubscriptionBanners() {
	const t = useTranslation();
	const pathname = usePathname();
	const locale = extractLocaleFromPath(pathname) ?? 'en';
	const subscriptionPath = withLocale('/subscription', locale as 'en' | 'ru' | 'vi');

	const { data: sub, isLoading } = useOwnerSubscription();
	const [checkoutLoading, setCheckoutLoading] = useState(false);

	const isPaid = (sub?.amount ?? 0) > 0;
	const expansionOk = sub?.configurationExpansionAllowed !== false;

	const trialDaysLeft = useMemo(() => {
		if (!sub?.trialEndDate || isPaid) return null;
		return daysUntil(new Date(sub.trialEndDate));
	}, [sub?.trialEndDate, isPaid]);

	const showTrialPromo =
		!isLoading &&
		sub &&
		!isPaid &&
		expansionOk &&
		trialDaysLeft !== null &&
		trialDaysLeft >= 0 &&
		trialDaysLeft <= TRIAL_PROMO_MAX_DAYS;

	const showLockedBanner =
		!isLoading && sub && !expansionOk && !isPaid;

	const handleAnnualCheckout = async () => {
		try {
			setCheckoutLoading(true);
			const { url } = await apiClient.post<{ url: string }>(
				'/subscriptions/create-checkout-session',
				{ interval: 'annual' }
			);
			if (url) window.location.href = url;
			else throw new Error('No checkout URL');
		} catch (e: unknown) {
			const msg =
				e instanceof Error ? e.message : t('owner.dashboard.trialPromoCheckoutError');
			toast.error(msg);
		} finally {
			setCheckoutLoading(false);
		}
	};

	if (isLoading || !sub) return null;

	if (showLockedBanner) {
		return (
			<div
				role="alert"
				className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
			>
				<div className="flex gap-3">
					<div className="flex-shrink-0 w-11 h-11 rounded-xl bg-amber-200 flex items-center justify-center">
						<AlertTriangle className="w-6 h-6 text-amber-900" />
					</div>
					<div>
						<h2 className="text-lg font-bold text-gray-900">
							{t('owner.dashboard.subscriptionLockedTitle')}
						</h2>
						<p className="text-gray-700 text-sm mt-1">
							{t('owner.dashboard.subscriptionLockedBody')}
						</p>
					</div>
				</div>
				<Link
					href={subscriptionPath}
					className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-semibold text-white bg-[#ff5b5b] hover:bg-[#e54f4f] whitespace-nowrap"
				>
					{t('owner.dashboard.subscriptionLockedCta')}
				</Link>
			</div>
		);
	}

	if (!showTrialPromo) return null;

	const trialEndFormatted = sub.trialEndDate
		? new Date(sub.trialEndDate).toLocaleDateString(
				locale === 'vi' ? 'vi-VN' : locale === 'ru' ? 'ru-RU' : 'en-US',
				{ day: 'numeric', month: 'long', year: 'numeric' }
			)
		: '';

	const hasExtraPromo =
		(sub.annualPromotionPercent ?? 0) > 0 && !isPaid;
	const promoPercent = sub.annualPromotionPercent ?? 0;
	const displayAnnual = hasExtraPromo
		? annualPriceAfterPercentOff(PRICE_ANNUAL_VND, promoPercent)
		: PRICE_ANNUAL_VND;

	return (
		<div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
			<div className="flex gap-3">
				<div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#fecaca] flex items-center justify-center">
					<Sparkles className="w-6 h-6 text-[#ff5b5b]" />
				</div>
				<div>
					<h2 className="text-lg font-bold text-gray-900">
						{t('owner.dashboard.trialPromoTitle')}
					</h2>
					<p className="text-gray-700 text-sm mt-1">
						{t('owner.dashboard.trialPromoBody')
							.replace('{{date}}', trialEndFormatted)
							.replace('{{percent}}', String(promoPercent))}
					</p>
					{hasExtraPromo && (
						<p className="text-gray-800 text-sm font-semibold mt-2">
							{t('owner.dashboard.trialPromoAnnualPrice').replace(
								'{{price}}',
								formatVnd(displayAnnual)
							)}
							{' · '}
							<span className="line-through text-gray-500 font-normal">
								{formatVnd(PRICE_ANNUAL_VND)}
							</span>
						</p>
					)}
				</div>
			</div>
			<div className="flex flex-col sm:flex-row gap-2 lg:flex-shrink-0">
				<button
					type="button"
					onClick={handleAnnualCheckout}
					disabled={checkoutLoading}
					className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-semibold text-white bg-[#ff5b5b] hover:bg-[#e54f4f] disabled:opacity-60"
				>
					{checkoutLoading
						? t('owner.dashboard.trialPromoLoading')
						: t('owner.dashboard.trialPromoCtaAnnual')}
				</button>
				<Link
					href={subscriptionPath}
					className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-semibold text-[#ff5b5b] border border-[#ff5b5b] hover:bg-white/80"
				>
					{t('owner.dashboard.trialPromoCtaPlans')}
				</Link>
			</div>
		</div>
	);
}
