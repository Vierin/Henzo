'use client';

import Link from 'next/link';
import { ImageWithFallback } from './ImageWithFallback';
import { useTranslation } from '@/contexts/LanguageContext';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';

export function Dashboard() {
	const t = useTranslation();

	return (
		<section id="dashboard" className="py-20 px-4">
			<div className="container mx-auto">
				<div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
					{/* Left side - Device mockup with dashboard screenshot */}
					<div className="relative order-2 lg:order-1">
						{/* Desktop browser mockup */}
						<div className="relative">
							{/* Browser frame */}
							<div className="bg-background rounded-t-lg border border-border shadow-2xl">
								{/* Browser header */}
								<div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border rounded-t-lg">
									<div className="flex gap-1.5">
										<div className="w-3 h-3 rounded-full bg-red-500/20"></div>
										<div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
										<div className="w-3 h-3 rounded-full bg-green-500/20"></div>
									</div>
									<div className="flex-1 mx-4">
										<div className="bg-background rounded px-3 py-1 text-xs text-muted-foreground text-center">
											henzo.app/dashboard
										</div>
									</div>
								</div>
								{/* Dashboard screenshot */}
								<div className="relative overflow-hidden bg-muted">
									<ImageWithFallback
										src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
										alt="Business dashboard"
										className="w-full h-auto"
									/>
								</div>
							</div>
							{/* Decorative gradient */}
							<div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg blur-3xl -z-10"></div>
						</div>
					</div>

					{/* Right side - Content */}
					<div className="space-y-8 order-1 lg:order-2">
						<div className="inline-block px-4 py-2 bg-secondary rounded-full">
							<span className="text-primary">{t('business.dashboard.badge')}</span>
						</div>

						<h2 className="text-4xl lg:text-5xl tracking-tight">
							{t('business.dashboard.title')} <br />
							<span className="text-primary">{t('business.dashboard.titleBreak')}</span>
						</h2>

						<p className="text-xl text-muted-foreground max-w-xl">
							{t('business.dashboard.subtitle')}
						</p>

						<div className="flex flex-col sm:flex-row gap-4">
							<Link href="#beta-form" className="cursor-pointer">
								<Button
									size="lg"
									className="bg-primary text-white hover:bg-primary/90 group w-full sm:w-auto"
								>
									{t('business.dashboard.cta')}
									<ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

