'use client';

import { ChaoticUnderline } from '@/components/landing/chaoticUnderline';
import { StoreBadgeLinks } from '@/components/landing/storeBadgeLinks';
import { useTranslation } from '@/contexts/LanguageContext';
import Image from 'next/image';
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
			className="bg-[#F9F4F0] h-screen px-6 pb-16 pt-8 md:px-10 md:pb-20 md:pt-10"
		>
			<div className="mx-auto max-w-7xl">
				<h2 className="text-center text-[#33363F]">
					<span className="block text-[clamp(2.3rem,5.6vw,5.25rem)] leading-[1.06] tracking-tight">
						{titleLine1}
					</span>
					<span className="relative mt-2 inline-block text-[clamp(2.3rem,5.6vw,5.25rem)] font-semibold leading-[1.04] tracking-tight text-[#F15942]">
						{titleLine2}
						<ChaoticUnderline
							color="#4D39A8"
							className="pointer-events-none absolute -bottom-1 left-[43%] w-[58%] -translate-x-[4%]"
						/>
					</span>
				</h2>

				<div className="mt-15 grid gap-7 md:grid-cols-2 md:gap-[9vw]">
					{plans.map((plan) => (
						<article
							key={plan.name}
							className="rounded-[1.4rem] border border-[#FF8A72] bg-white p-5 pb-11"
						>
							<div className="flex items-start gap-6 flex align-center">
								<div className="aspect-square w-[4rem] rounded-2xl bg-[#F15942]" />
								<div className="font-medium">
									<h3 className="text-[1.5rem] leading-tight text-[#33363F]">
										{plan.name}
									</h3>
									<p className="text-[1rem] leading-tight text-[#33363F]">
										{plan.subtitle}
									</p>
								</div>
							</div>

							<div className="my-10 border-t border-[#3F3F3F]" />

							<div className="">
								<p className="text-[4.9rem] font-medium leading-none tracking-tight text-[#33363F]">
									{plan.price}
								</p>
								<p className="mt-3 text-[1rem] text-[#3F3F3F]">
									{plan.priceSub}
								</p>
							</div>

							<ul className="mt-13 space-y-4">
								{plan.features.map((feature) => (
									<li
										key={`${plan.name}-${feature}`}
										className="flex items-start gap-3 text-[1.03rem] leading-snug text-[#151515]"
									>
										<Image
											className="pt-0.5"
											src="/images/icon-fire.png"
											alt="Fire"
											width={16}
											height={16}
										/>
										<span>{feature}</span>
									</li>
								))}
							</ul>
						</article>
					))}
				</div>

				<StoreBadgeLinks
					className="mt-12 flex flex-wrap items-center justify-center gap-4 md:mt-20 md:gap-10"
					buttonClassName="bg-white"
					appStoreLabel={appStoreLabel}
					googlePlayLabel={googlePlayLabel}
				/>
			</div>
		</section>
	);
}
