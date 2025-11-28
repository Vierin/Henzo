'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';
import { useTranslation } from '@/contexts/LanguageContext';

export function Hero() {
	const t = useTranslation();
	return (
		<section className="pt-32 pb-20 px-4 overflow-hidden">
			<div className="container mx-auto">
				<div className="grid lg:grid-cols-2 gap-12 items-center">
					<div className="space-y-8">
						<div className="inline-block px-4 py-2 bg-secondary rounded-full">
							<span className="text-primary">{t.business.hero.badge}</span>
						</div>

						<h1 className="text-5xl lg:text-6xl tracking-tight">
							{t.business.hero.title}{' '}
							<span className="text-primary">{t.business.hero.titleHighlight}</span>
						</h1>

						<p className="text-xl text-muted-foreground max-w-xl">
							{t.business.hero.subtitle}
						</p>

						<div className="flex flex-col sm:flex-row gap-4">
							<Link href="#beta-form" className="cursor-pointer">
								<Button
									size="lg"
									className="bg-primary text-white hover:bg-primary/90 group w-full sm:w-auto"
								>
									{t.business.hero.joinBeta}
									<ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
								</Button>
							</Link>
							<Link href="/login" className="cursor-pointer">
								<Button
									size="lg"
									variant="outline"
									className="w-full sm:w-auto"
								>
									{t.business.hero.signIn}
								</Button>
							</Link>
						</div>

						<div className="flex items-center gap-8 pt-4">
							<div>
								<div className="text-3xl">{t.business.hero.free}</div>
								<div className="text-sm text-muted-foreground">
									{t.business.hero.freePeriod}
								</div>
							</div>
							<div className="w-px h-12 bg-border"></div>
							<div>
								<div className="text-3xl">{t.business.hero.quickStart}</div>
								<div className="text-sm text-muted-foreground">
									{t.business.hero.quickStartTime}
								</div>
							</div>
						</div>
					</div>

					<div className="relative">
						<div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-3xl"></div>
						<div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
							<ImageWithFallback
								src="https://images.unsplash.com/photo-1627037118727-cd7095b7ef02?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1742"
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
