'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { SUBSCRIPTION_PLANS_LEGACY } from '@/config/subscriptionPlans';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';

export function Pricing() {
	const t = useTranslation();
	const plan = SUBSCRIPTION_PLANS_LEGACY.STARTER;
	const features = [
		t('business.pricing.feature1'),
		t('business.pricing.feature2'),
		t('business.pricing.feature3'),
		t('business.pricing.feature4'),
		t('business.pricing.feature5'),
		t('business.pricing.feature6'),
	];

	return (
		<section id="pricing" className="py-20 px-4 bg-[#fafafa]">
			<div className="container mx-auto max-w-4xl">
				<div className="text-center max-w-3xl mx-auto mb-12">
					<div className="inline-block px-4 py-2 border border-[#ff5b5b] rounded-full mb-4">
						<span className="text-[#ff5b5b] text-sm font-medium">
							{t('business.pricing.badge')}
						</span>
					</div>
					<h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-4">
						{t('business.pricing.title')} <br />
						<span className="text-[#ff5b5b]">
							{t('business.pricing.titleBreak')}
						</span>
					</h2>
					<p className="text-lg text-gray-600">
						{t('business.pricing.subtitle')}
					</p>
				</div>

				<div className="bg-white border-2 border-gray-200 rounded-2xl shadow-lg overflow-hidden">
					<div className="p-6 md:p-10">
						<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
							<div>
								<h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
									{plan.name}
								</h3>
								<p className="text-xl md:text-2xl font-bold text-[#ff5b5b] mb-1">
									{t('business.pricing.threeMonthsFree')}
								</p>
								<p className="text-gray-500 text-base">
									{t('business.pricing.thenPrice')}{' '}
									{plan.price.toLocaleString('vi-VN').replace(/\./g, ' ')} ₫/
									{t('business.pricing.perMonth')}
								</p>
							</div>
							<Link href="#beta-form" className="cursor-pointer shrink-0">
								<Button
									size="lg"
									className="bg-[#ff5b5b] text-white hover:bg-[#e04a4a] w-full sm:w-auto"
								>
									{t('business.pricing.cta')}
									<ArrowRight className="ml-2 w-4 h-4" />
								</Button>
							</Link>
						</div>
						<ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 mt-8 pt-8 border-t border-gray-200">
							{features.map((feature, index) => (
								<li key={index} className="flex items-start gap-3">
									<span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#ff5b5b]/10 flex items-center justify-center mt-0.5">
										<Check
											className="w-4 h-4 text-[#ff5b5b]"
											strokeWidth={2.5}
										/>
									</span>
									<span className="text-gray-700 font-medium text-sm">
										{feature}
									</span>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
		</section>
	);
}
