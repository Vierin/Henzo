'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';

export function CTA() {
	return (
		<section className="py-20 px-4 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary">
			<div className="container mx-auto">
				<div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
					<div className="space-y-6">
						<h2 className="text-4xl lg:text-5xl tracking-tight">
							Ready to Transform Your Salon?
						</h2>

					<p className="text-xl text-muted-foreground">
						Join Henzo's beta testing program. Completely free during beta,
						no commitments required.
					</p>

						<div className="flex flex-col sm:flex-row gap-4">
							<Link href="#beta-form">
								<Button
									size="lg"
									className="bg-primary hover:bg-primary/90 group w-full sm:w-auto"
								>
									Start for Free
									<ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
								</Button>
							</Link>
						</div>

						<div className="flex items-center gap-4 pt-4">
							<div className="text-sm">
								<div>Join our beta testers and get free access</div>
							</div>
						</div>
					</div>

					<div className="relative">
						<div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-3xl blur-3xl"></div>
						<div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
							<ImageWithFallback
								src="https://images.unsplash.com/photo-1647462742033-f4e39fa481b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyJTIwc2Fsb24lMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzYwMjU5MDg1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
								alt="Professional hair salon"
								className="w-full h-auto"
							/>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
