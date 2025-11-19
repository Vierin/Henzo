'use client';

import { Shield, Heart, Users, Zap, Award, TrendingUp } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

export function ValuesSection() {
	const t = useTranslation();

	const values = [
		{
			icon: Shield,
			title: t.about.trustSafety,
			description: t.about.trustSafetyDescription,
		},
		{
			icon: Heart,
			title: t.about.customerFirst,
			description: t.about.customerFirstDescription,
		},
		{
			icon: Users,
			title: t.about.communityDriven,
			description: t.about.communityDrivenDescription,
		},
		{
			icon: Zap,
			title: t.about.innovation,
			description: t.about.innovationDescription,
		},
		{
			icon: Award,
			title: t.about.qualityStandards,
			description: t.about.qualityStandardsDescription,
		},
		{
			icon: TrendingUp,
			title: t.about.growthTogether,
			description: t.about.growthTogetherDescription,
		},
	];
	return (
		<section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50">
			<div className="max-w-7xl mx-auto">
				<div className="text-center mb-16">
					<h2 className="mb-4 text-foreground text-4xl font-semibold">
						{t.about.valuesSectionTitle}
					</h2>
					<p className="text-muted-foreground max-w-2xl mx-auto text-lg">
						{t.about.valuesSectionSubtitle}
					</p>
				</div>

				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
					{values.map((value, index) => (
						<div
							key={index}
							className="bg-card border border-border rounded-2xl p-8 hover:shadow-lg hover:border-primary/30 transition-all"
						>
							<div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
								<value.icon className="text-primary" size={28} />
							</div>
							<h3 className="mb-3 text-foreground font-semibold text-xl">
								{value.title}
							</h3>
							<p className="text-muted-foreground">{value.description}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
