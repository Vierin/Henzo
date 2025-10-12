import { ImageWithFallback } from './ImageWithFallback';
import { CheckCircle2 } from 'lucide-react';

const benefits = [
	'Increase bookings with 24/7 online scheduling',
	'Save 10+ hours per week on administrative tasks',
	'Reduce no-shows with automated reminders',
	'Build client loyalty with a convenient booking system',
	'Make data-driven decisions with powerful analytics',
	'Payment happens on-site - no online payment complexities',
];

export function Benefits() {
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
							<span className="text-primary">Why Henzo</span>
						</div>

						<h2 className="text-4xl lg:text-5xl tracking-tight">
							Grow Your Business <br />
							<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
								with Confidence
							</span>
						</h2>

						<p className="text-xl text-muted-foreground">
							A platform designed specifically for the beauty industry. Join our
							beta testing and get free access.
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
