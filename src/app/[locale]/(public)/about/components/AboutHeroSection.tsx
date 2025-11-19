'use client';

import { Heart, Users, Target } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useTranslation } from '@/contexts/LanguageContext';

export function AboutHeroSection() {
	const t = useTranslation();
	return (
		<section className="pt-8 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
			<div className="max-w-7xl mx-auto">
				<div className="text-center mb-16">
					<div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-accent/50 rounded-full">
						<Heart className="text-primary fill-primary" size={16} />
						<span className="text-foreground">{t.about.ourStory}</span>
					</div>

					<h1
						className="mb-6 text-foreground tracking-tight max-w-4xl mx-auto text-4xl md:text-5xl font-semibold leading-[1.1]"
						dangerouslySetInnerHTML={{ __html: t.about.heroTitle }}
					/>

					<p className="text-muted-foreground max-w-2xl mx-auto text-xl">
						{t.about.heroSubtitle}
					</p>
				</div>

				<div className="relative rounded-3xl overflow-hidden shadow-2xl mb-16">
					<ImageWithFallback
						src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwbWVldGluZyUyMGRpdmVyc2V8ZW58MXx8fHwxNzYwMjYwOTg1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
						alt="Henzo team"
						className="w-full h-auto"
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
				</div>

				<div className="grid md:grid-cols-3 gap-8">
					{[
						{
							icon: Heart,
							title: t.about.missionTitle,
							description: t.about.missionDescription,
						},
						{
							icon: Target,
							title: t.about.visionTitle,
							description: t.about.visionDescription,
						},
						{
							icon: Users,
							title: t.about.valuesTitle,
							description: t.about.valuesDescription,
						},
					].map((item, index) => (
						<div
							key={index}
							className="bg-card border border-border rounded-2xl p-8 text-center hover:shadow-lg hover:border-primary/30 transition-all"
						>
							<div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
								<item.icon className="text-primary" size={32} />
							</div>
							<h3 className="mb-3 text-foreground font-semibold text-xl">
								{item.title}
							</h3>
							<p className="text-muted-foreground">{item.description}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
