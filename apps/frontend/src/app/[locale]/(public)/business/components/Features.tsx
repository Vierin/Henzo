'use client';

import { Calendar, Users, Bell, BarChart3 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { useTranslation } from '@/contexts/LanguageContext';

export function Features() {
	const t = useTranslation();

	const features = [
		{
			icon: Calendar,
			title: t('business.features.smartScheduling.title'),
			description: t('business.features.smartScheduling.shortDescription'),
			resultValue: t('business.features.smartScheduling.resultValue'),
			resultLabel: t('business.features.smartScheduling.resultLabel'),
		},
		{
			icon: Users,
			title: t('business.features.onlineBooking.title'),
			description: t('business.features.onlineBooking.shortDescription'),
			resultValue: t('business.features.onlineBooking.resultValue'),
			resultLabel: t('business.features.onlineBooking.resultLabel'),
		},
		{
			icon: Bell,
			title: t('business.features.emailReminders.title'),
			description: t('business.features.emailReminders.shortDescription'),
			resultValue: t('business.features.emailReminders.resultValue'),
			resultLabel: t('business.features.emailReminders.resultLabel'),
		},
		{
			icon: BarChart3,
			title: t('business.features.analytics.title'),
			description: t('business.features.analytics.shortDescription'),
			resultValue: t('business.features.analytics.resultValue'),
			resultLabel: t('business.features.analytics.resultLabel'),
		},
	];

	return (
		<section id="features" className="py-20 px-4 bg-muted/30">
			<div className="container mx-auto">
				<div className="text-center max-w-4xl mx-auto mb-16">
					<div className="inline-block px-4 py-2 border border-secondary rounded-full mb-4">
						<span className="text-primary text-medium">
							{t('business.features.badge')}
						</span>
					</div>
					<h2 className="text-4xl lg:text-5xl tracking-tight mb-4">
						{t('business.features.title')} <br />{' '}
						{t('business.features.titleBreak')}
					</h2>
				</div>

				<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
					{features.map((feature, index) => (
						<Card
							key={index}
							className="border-border/60 bg-background/80 backdrop-blur-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
						>
							<CardContent className="p-6 h-full flex flex-col">
								<div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
									<feature.icon className="w-6 h-6 text-primary" />
								</div>
								<h3 className="mb-3 text-lg sm:text-xl font-bold leading-tight">
									{feature.title}
								</h3>
								<p className="text-muted-foreground leading-relaxed text-sm sm:text-base mb-5">
									{feature.description}
								</p>
								<div className="mt-auto rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
									<div className="text-2xl font-bold text-primary tracking-tight">
										{feature.resultValue}
									</div>
									<p className="text-xs sm:text-sm text-muted-foreground">
										{feature.resultLabel}
									</p>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
