import { Calendar, Users, Bell, BarChart3 } from 'lucide-react';
import { Card, CardContent } from './ui/card';

const features = [
	{
		icon: Calendar,
		title: 'Smart Scheduling',
		description:
			"Intelligent calendar that prevents double bookings and automatically optimizes your team's time.",
	},
	{
		icon: Users,
		title: 'Client Management',
		description:
			'Keep detailed client profiles, preferences, and service history all in one place.',
	},
	{
		icon: Bell,
		title: 'Email Reminders',
		description: 'Reduce no-shows with automatic email appointment reminders.',
	},
	{
		icon: BarChart3,
		title: 'Analytics',
		description:
			'Track popular services and staff performance with real-time insights.',
	},
];

export function Features() {
	return (
		<section id="features" className="py-20 px-4 bg-muted/30">
			<div className="container mx-auto">
				<div className="text-center max-w-3xl mx-auto mb-16">
					<div className="inline-block px-4 py-2 bg-secondary rounded-full mb-4">
						<span className="text-primary">Features</span>
					</div>
					<h2 className="text-4xl lg:text-5xl tracking-tight mb-4">
						Everything You Need <br /> to Run Your Salon
					</h2>
					<p className="text-xl text-muted-foreground">
						Powerful features designed to save you time and help your business
						grow
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
