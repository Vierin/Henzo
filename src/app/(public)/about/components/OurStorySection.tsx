import { ImageWithFallback } from './figma/ImageWithFallback';
import { CheckCircle2, Lightbulb, Rocket, Target } from 'lucide-react';

const roadmap = [
	{
		icon: Lightbulb,
		title: 'The Problem',
		description:
			"Identified the challenge: Vietnamese beauty salons struggle with online booking, while clients can't easily find and compare services.",
	},
	{
		icon: Rocket,
		title: 'Building MVP',
		description:
			'Developed core platform: salon profiles, service listings, online booking system, and review functionality.',
	},
	{
		icon: Target,
		title: 'Beta Launch',
		description: 'Launching beta with first partner salons in Da Nang.',
	},
	{
		icon: CheckCircle2,
		title: 'Vision',
		description:
			'Scale to 100+ salons, mobile app, loyalty programs, and advanced analytics for salon owners.',
	},
];

export function OurStorySection() {
	return (
		<section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50">
			<div className="max-w-7xl mx-auto">
				<div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
					<div>
						<h2
							className="mb-6 text-foreground"
							style={{
								fontSize: '2.5rem',
								fontWeight: '600',
								lineHeight: '1.2',
							}}
						>
							How It All Started
						</h2>

						<p
							className="mb-4 text-muted-foreground"
							style={{ fontSize: '1.125rem' }}
						>
							Henzo was born from a simple question: Why is finding a reliable
							beauty salon in Vietnam still so difficult in 2024?
						</p>

						<p
							className="mb-4 text-muted-foreground"
							style={{ fontSize: '1.125rem' }}
						>
							After researching the Vietnamese beauty market, we discovered that
							talented salon owners lack affordable tools for online booking,
							while customers waste time calling salons to check availability.
						</p>

						<p
							className="text-muted-foreground"
							style={{ fontSize: '1.125rem' }}
						>
							We're building Henzo to solve this.{' '}
							<strong>Currently in development</strong>, we're preparing for
							beta launch with partner salons.{' '}
							<strong className="text-primary">
								Join us on this journey - it's free for beta program.
							</strong>
						</p>
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
					<h2
						className="mb-4 text-foreground"
						style={{ fontSize: '2.5rem', fontWeight: '600' }}
					>
						Our Roadmap
					</h2>
					<p
						className="text-muted-foreground max-w-2xl mx-auto"
						style={{ fontSize: '1.125rem' }}
					>
						We're just getting started - here's our journey from idea to
						platform
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
									<h3
										className="mb-3 text-foreground"
										style={{ fontWeight: '600', fontSize: '1.125rem' }}
									>
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
