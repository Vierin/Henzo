'use client';

import { ImageWithFallback } from './ImageWithFallback';
import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

export function Benefits() {
	const t = useTranslation();

	const benefits = [
		{
			benefit: t('business.benefits.benefit1'),
			description: t('business.benefits.benefit1Description'),
		},
		{
			benefit: t('business.benefits.benefit2'),
			description: t('business.benefits.benefit2Description'),
		},
		{
			benefit: t('business.benefits.benefit3'),
			description: t('business.benefits.benefit3Description'),
		},
		{
			benefit: t('business.benefits.benefit4'),
			description: t('business.benefits.benefit4Description'),
		},
		{
			benefit: t('business.benefits.benefit5'),
			description: t('business.benefits.benefit5Description'),
		},
		{
			benefit: t('business.benefits.benefit6'),
			description: t('business.benefits.benefit6Description'),
		},
	];

	return (
		<section id="benefits" className="py-20 px-4 bg-[#fafafa]">
			<div className="container mx-auto max-w-7xl">
				<div className="grid lg:grid-cols-2 gap-12 items-center">
					{/* Image - Left Side */}
					<div className="order-2 lg:order-1">
						<div className="relative rounded-2xl overflow-hidden">
							<ImageWithFallback
								src="https://images.unsplash.com/photo-1626383137804-ff908d2753a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBzYWxvbiUyMGludGVyaW9yfGVufDF8fHx8MTc2MDE3MDQ2Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
								alt="Beautiful salon interior"
								className="w-full h-auto rounded-2xl"
							/>
						</div>
					</div>

					{/* Content - Right Side */}
					<div className="space-y-6 order-1 lg:order-2">
						{/* Badge */}
						<div className="inline-block px-4 py-2 border border-[#ff5b5b] rounded-full">
							<span className="text-[#ff5b5b] text-sm font-medium">
								{t('business.benefits.badge')}
							</span>
						</div>

						{/* Title */}
						<h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
							{t('business.benefits.title')} <br />
							<span className="text-[#ff5b5b]">
								{t('business.benefits.titleBreak')}
							</span>
						</h2>

						{/* Subtitle */}
						<p className="text-lg text-gray-600 leading-[1.2]">
							{t('business.benefits.subtitle')}
						</p>

						{/* Benefits List */}
						<div className="space-y-4 pt-2">
							{benefits.map((item, index) => (
								<div key={index} className="flex items-start gap-3">
									<CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" strokeWidth={1} />
									<div className="flex-1">
										<span className="text-black font-bold leading-relaxed">{item.benefit} </span>
										<p className="text-black/80 text-sm">{item.description}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
