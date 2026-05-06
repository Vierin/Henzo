'use client';

import { StoreBadgeLinks } from '@/components/landing/storeBadgeLinks';
import { useTranslation } from '@/contexts/LanguageContext';
import { useMemo } from 'react';

const BASE = 'homepage.studio.pricing';

type PricingPlan = {
	name: string;
	subtitle: string;
	price: string;
	priceSub: string;
	features: string[];
};

function parsePlans(raw: unknown): PricingPlan[] {
	if (!Array.isArray(raw)) {
		return [];
	}
	return raw.filter(
		(x): x is PricingPlan =>
			x !== null &&
			typeof x === 'object' &&
			'name' in x &&
			'subtitle' in x &&
			'price' in x &&
			'priceSub' in x &&
			'features' in x &&
			typeof (x as PricingPlan).name === 'string' &&
			typeof (x as PricingPlan).subtitle === 'string' &&
			typeof (x as PricingPlan).price === 'string' &&
			typeof (x as PricingPlan).priceSub === 'string' &&
			Array.isArray((x as PricingPlan).features) &&
			(x as PricingPlan).features.every((f) => typeof f === 'string'),
	);
}

function BlueUnderline() {
	return (
		<svg
			className="pointer-events-none absolute -bottom-1 left-0 w-[108%] -translate-x-[4%]"
			viewBox="0 0 210 14"
			fill="none"
			aria-hidden
		>
			<path
				d="M3 7.5 C 40 11, 76 3.5, 112 8.5 C 146 12, 174 5, 207 9"
				stroke="#3A48C9"
				strokeWidth="3"
				strokeLinecap="round"
			/>
		</svg>
	);
}

export function LandingPricingSection() {
	const t = useTranslation();
	const titleLine1 = String(t(`${BASE}.titleLine1`));
	const titleLine2 = String(t(`${BASE}.titleLine2`));
	const appStoreLabel = String(t(`${BASE}.storeAppStore`));
	const googlePlayLabel = String(t(`${BASE}.storeGooglePlay`));
	const plans = useMemo(() => parsePlans(t(`${BASE}.plans`)), [t]);

	if (plans.length === 0) {
		return null;
	}

	return (
		<section
			id="pricing"
			className="bg-[#F9F4F0] px-6 pb-16 pt-8 md:px-10 md:pb-20 md:pt-10"
		>
			<div className="mx-auto max-w-[1220px]">
				<h2 className="text-center text-[#33363F]">
					<span className="block text-[clamp(2.3rem,5.6vw,5.25rem)] leading-[1.06] tracking-tight">
						{titleLine1}
					</span>
					<span className="relative mt-2 inline-block text-[clamp(2.3rem,5.6vw,5.25rem)] font-semibold leading-[1.04] tracking-tight text-[#F15942]">
						{titleLine2}
						<BlueUnderline />
					</span>
				</h2>

				<div className="mt-10 grid gap-7 md:mt-12 md:grid-cols-2 md:gap-8">
					{plans.map((plan) => (
						<article
							key={plan.name}
							className="rounded-[1.4rem] border border-[#FF8A72] bg-white px-6 py-5 md:px-7 md:py-6"
						>
							<div className="flex items-start gap-3">
								<div className="h-11 w-11 rounded-xl bg-[#F15942]" />
								<div>
									<h3 className="text-[1.85rem] font-medium leading-tight text-[#33363F]">
										{plan.name}
									</h3>
									<p className="mt-0.5 text-[1.05rem] leading-tight text-[#33363F]">
										{plan.subtitle}
									</p>
								</div>
							</div>

							<div className="mt-5 border-t border-[#CDD0D7]" />

							<div className="mt-6">
								<p className="text-[4.9rem] font-medium leading-none tracking-tight text-[#33363F]">
									{plan.price}
								</p>
								<p className="mt-2 text-[1.05rem] text-[#33363F]">{plan.priceSub}</p>
							</div>

							<ul className="mt-8 space-y-3">
								{plan.features.map((feature) => (
									<li
										key={`${plan.name}-${feature}`}
										className="flex items-start gap-2 text-[1.03rem] leading-snug text-[#151515]"
									>
										<span aria-hidden className="pt-0.5">
											🔥
										</span>
										<span>{feature}</span>
									</li>
								))}
							</ul>
						</article>
					))}
				</div>

				<StoreBadgeLinks
					className="mt-10 flex flex-wrap items-center justify-center gap-4 md:mt-12 md:gap-5"
					appStoreLabel={appStoreLabel}
					googlePlayLabel={googlePlayLabel}
				/>
			</div>
		</section>
	);
}
