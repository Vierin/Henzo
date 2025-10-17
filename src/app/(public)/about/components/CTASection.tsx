'use client';

import { Button } from './ui/button';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export function CTASection() {
	return (
		<section className="md:py-20 py-8 px-4 sm:px-6 lg:px-8 bg-muted/50">
			<div className="max-w-7xl mx-auto">
				<div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 rounded-3xl py-12 px-6 md:p-16">
					{/* Background decoration */}
					<div className="absolute inset-0 opacity-10">
						<div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
						<div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
						<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
							<Sparkles
								className="absolute top-10 right-20 text-white"
								size={24}
							/>
							<Sparkles
								className="absolute bottom-20 left-10 text-white"
								size={32}
							/>
							<Sparkles
								className="absolute top-1/3 left-1/4 text-white"
								size={20}
							/>
						</div>
					</div>

					<div className="relative z-10 text-center max-w-3xl mx-auto">
						<h2 className="mb-6 text-primary-foreground text-2xl md:text-4xl font-semibold leading-tight">
							Ready to Transform Your Look?
						</h2>

						<p className="mb-8 text-primary-foreground/90 text-base md:text-xl">
							Download the Henzo app and get exclusive access to special deals,
							instant booking, and personalized recommendations.
						</p>

						<div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
							<Link href="/salons">
								<Button
									size="lg"
									variant="outline"
									className="gap-2 bg-transparent w-40 mx-auto md:mx-0 md:w-auto text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/10 hover:text-primary-foreground"
								>
									Book Online
								</Button>
							</Link>
						</div>

						<div className="flex flex-wrap items-center justify-center gap-2 md:gap-8 text-sm md:text-base text-primary-foreground/80">
							<div className="flex items-center gap-2">
								<svg
									className="w-5 h-5"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
								</svg>
								<span>No credit card required</span>
							</div>
							<div className="flex items-center gap-2">
								<svg
									className="w-5 h-5"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
								</svg>
								<span>Free to use</span>
							</div>
							<div className="flex items-center gap-2">
								<svg
									className="w-5 h-5"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
								</svg>
								<span>Cancel anytime</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
