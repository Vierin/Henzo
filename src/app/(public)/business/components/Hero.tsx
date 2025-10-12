'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';

export function Hero() {
	return (
		<section className="pt-32 pb-20 px-4 overflow-hidden">
			<div className="container mx-auto">
				<div className="grid lg:grid-cols-2 gap-12 items-center">
					<div className="space-y-8">
						<div className="inline-block px-4 py-2 bg-secondary rounded-full">
							<span className="text-primary">✨ Free Beta Testing</span>
						</div>

						<h1 className="text-5xl lg:text-6xl tracking-tight">
							Simplify Bookings,{' '}
							<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
								Delight Clients
							</span>
						</h1>

						<p className="text-xl text-muted-foreground max-w-xl">
							The all-in-one platform for your beauty business. Manage
							appointments, clients, and payments all in one place.
						</p>

						<div className="flex flex-col sm:flex-row gap-4">
							<Link href="#beta-form">
								<Button
									size="lg"
									className="bg-primary hover:bg-primary/90 group w-full sm:w-auto"
								>
									Join Beta Testing
									<ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
								</Button>
							</Link>
							<Link href="/login">
								<Button
									size="lg"
									variant="outline"
									className="w-full sm:w-auto"
								>
									Sign In
								</Button>
							</Link>
						</div>

						<div className="flex items-center gap-8 pt-4">
							<div>
								<div className="text-3xl">100% Free</div>
								<div className="text-sm text-muted-foreground">
									Beta testing period
								</div>
							</div>
							<div className="w-px h-12 bg-border"></div>
							<div>
								<div className="text-3xl">Quick Start</div>
								<div className="text-sm text-muted-foreground">
									Live in 5 minutes
								</div>
							</div>
						</div>
					</div>

					<div className="relative">
						<div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-3xl"></div>
						<div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
							<ImageWithFallback
								src="https://images.unsplash.com/photo-1626383137804-ff908d2753a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBzYWxvbiUyMGludGVyaW9yfGVufDF8fHx8MTc2MDE3MDQ2Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
								alt="Beautiful salon interior"
								className="w-full h-auto"
							/>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
