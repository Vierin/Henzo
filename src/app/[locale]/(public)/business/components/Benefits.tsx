'use client';

import { ImageWithFallback } from './ImageWithFallback';
import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

export function Benefits() {
	const t = useTranslation();

	const benefits = [
		t('business.benefits.benefit1'),
		t('business.benefits.benefit2'),
		t('business.benefits.benefit3'),
		t('business.benefits.benefit4'),
		t('business.benefits.benefit5'),
		t('business.benefits.benefit6'),
	];

	return (
		<section id="benefits" className="py-20 px-4">
			<div className="container mx-auto">
				<div className="grid lg:grid-cols-2 gap-12 items-center">
					<div className="order-2 lg:order-1 relative">
						<div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/20 rounded-3xl blur-3xl"></div>
						<div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
							<ImageWithFallback
								src="https://images.unsplash.com/photo-1626383137804-ff908d2753a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBzYWxvbiUyMGludGVyaW9yfGVufDF8fHx8MTc2MDE3MDQ2Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
								alt="Beautiful salon interior"
								className="w-full h-auto"
							/>
						</div>
					</div>

					<div className="space-y-8 order-1 lg:order-2">
						<div className="inline-block px-4 py-2 bg-secondary rounded-full">
							<span className="text-primary">
								{t('business.benefits.badge')}
							</span>
						</div>

						<h2 className="text-4xl lg:text-5xl tracking-tight">
							{t('business.benefits.title')} <br />
							<span className="text-primary">
								{t('business.benefits.titleBreak')}
							</span>
						</h2>

						<p className="text-xl text-muted-foreground">
							{t('business.benefits.subtitle')}
						</p>

						<div className="space-y-4">
							{benefits.map((benefit, index) => (
								<div key={index} className="flex items-start gap-3">
									<CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
									<span className="text-foreground">{benefit}</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
