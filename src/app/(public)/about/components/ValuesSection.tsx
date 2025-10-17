import { Shield, Heart, Users, Zap, Award, TrendingUp } from 'lucide-react';

const values = [
	{
		icon: Shield,
		title: 'Trust & Safety',
		description:
			'Every salon is verified and reviewed. We prioritize your safety and satisfaction above all.',
	},
	{
		icon: Heart,
		title: 'Customer First',
		description:
			"Your beauty journey matters to us. We're committed to providing exceptional service every step of the way.",
	},
	{
		icon: Users,
		title: 'Community Driven',
		description:
			'We build connections between beauty professionals and clients, fostering a supportive community.',
	},
	{
		icon: Zap,
		title: 'Innovation',
		description:
			'Constantly improving our platform with the latest technology to enhance your experience.',
	},
	{
		icon: Award,
		title: 'Quality Standards',
		description:
			'We partner only with the best professionals who meet our rigorous quality criteria.',
	},
	{
		icon: TrendingUp,
		title: 'Growth Together',
		description:
			'We succeed when our salons and customers thrive. Your growth is our growth.',
	},
];

export function ValuesSection() {
	return (
		<section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50">
			<div className="max-w-7xl mx-auto">
				<div className="text-center mb-16">
					<h2
						className="mb-4 text-foreground"
						style={{ fontSize: '2.5rem', fontWeight: '600' }}
					>
						What We Stand For
					</h2>
					<p
						className="text-muted-foreground max-w-2xl mx-auto"
						style={{ fontSize: '1.125rem' }}
					>
						Our core values guide every decision we make and shape the Henzo
						experience
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
							<h3
								className="mb-3 text-foreground"
								style={{ fontWeight: '600', fontSize: '1.25rem' }}
							>
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
