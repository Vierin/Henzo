'use client';

import { ImageWithFallback } from './figma/ImageWithFallback';
import { CheckCircle2, Lightbulb, Rocket, Target } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

export function OurStorySection() {
	const t = useTranslation();

	const roadmap = [
		{
			icon: Lightbulb,
			title: t.about.roadmapProblem,
			description: t.about.roadmapProblemDescription,
		},
		{
			icon: Rocket,
			title: t.about.roadmapMVP,
			description: t.about.roadmapMVPDescription,
		},
		{
			icon: Target,
			title: t.about.roadmapBeta,
			description: t.about.roadmapBetaDescription,
		},
		{
			icon: CheckCircle2,
			title: t.about.roadmapVision,
			description: t.about.roadmapVisionDescription,
		},
	];
	return (
		<section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50">
			<div className="max-w-7xl mx-auto">
				<div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
					<div>
						<h2 className="mb-6 text-foreground text-4xl font-semibold leading-tight">
							{t.about.howItStartedTitle}
						</h2>

						<p className="mb-4 text-muted-foreground text-lg">
							{t.about.howItStarted1}
						</p>

						<p className="mb-4 text-muted-foreground text-lg">
							{t.about.howItStarted2}
						</p>

						<p
							className="text-muted-foreground text-lg"
							dangerouslySetInnerHTML={{ __html: t.about.howItStarted3 }}
						/>
					</div>

					<div className="relative rounded-3xl overflow-hidden shadow-2xl">
						<ImageWithFallback
							src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFydHVwJTIwb2ZmaWNlJTIwd29ya3NwYWNlfGVufDF8fHx8MTc2MDI2MDk4NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
							alt="Our workspace"
							className="w-full h-auto"
						/>
					</div>
				</div>

				{/* Roadmap */}
				<div className="text-center mb-12">
					<h2 className="mb-4 text-foreground text-4xl font-semibold">
						{t.about.roadmapTitle}
					</h2>
					<p className="text-muted-foreground max-w-2xl mx-auto text-lg">
						{t.about.roadmapSubtitle}
					</p>
				</div>

				<div className="relative">
					{/* Timeline line */}
					<div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary opacity-30" />

					<div className="grid md:grid-cols-4 gap-8">
						{roadmap.map((item, index) => (
							<div key={index} className="relative">
								<div className="flex flex-col items-center text-center">
									<div className="relative mb-6">
										<div className="w-20 h-20  rounded-full bg-primary from-primary to-primary/70 flex items-center justify-center shadow-lg relative z-10">
											<item.icon
												className="text-primary-foreground"
												size={28}
											/>
										</div>
									</div>
									<h3 className="mb-3 text-foreground font-semibold text-lg">
										{item.title}
									</h3>
									<p className="text-muted-foreground">{item.description}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
