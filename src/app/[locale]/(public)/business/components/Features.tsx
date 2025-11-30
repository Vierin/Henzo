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
			description: t('business.features.smartScheduling.description'),
		},
		{
			icon: Users,
			title: t('business.features.clientManagement.title'),
			description: t('business.features.clientManagement.description'),
		},
		{
			icon: Bell,
			title: t('business.features.emailReminders.title'),
			description: t('business.features.emailReminders.description'),
		},
		{
			icon: BarChart3,
			title: t('business.features.analytics.title'),
			description: t('business.features.analytics.description'),
		},
	];

	return (
		<section id="features" className="py-20 px-4 bg-muted/30">
			<div className="container mx-auto">
				<div className="text-center max-w-3xl mx-auto mb-16">
					<div className="inline-block px-4 py-2 bg-secondary rounded-full mb-4">
						<span className="text-primary">{t('business.features.badge')}</span>
					</div>
					<h2 className="text-4xl lg:text-5xl tracking-tight mb-4">
						{t('business.features.title')} <br />{' '}
						{t('business.features.titleBreak')}
					</h2>
					<p className="text-xl text-muted-foreground">
						{t('business.features.subtitle')}
					</p>
				</div>

				<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
					{features.map((feature, index) => (
						<Card
							key={index}
							className="border-border hover:shadow-lg transition-shadow bg-card"
						>
							<CardContent className="p-6">
								<div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
									<feature.icon className="w-6 h-6 text-primary" />
								</div>
								<h3 className="mb-2">{feature.title}</h3>
								<p className="text-muted-foreground">{feature.description}</p>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
