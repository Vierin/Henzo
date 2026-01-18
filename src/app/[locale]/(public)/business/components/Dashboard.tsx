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
					{/* Left side - Dashboard panel Henzo */}
					<div className="relative w-[50vw] left-[-50%] top-0">
						<ImageWithFallback
							src="/images/mockup-1.webp"
							alt="Business dashboard panel Henzo"
							className="w-full h-auto"
						/> 
					</div>  
					{/* Right side - Content */}
					<div className="space-y-8 order-1 lg:order-2">
						<div className="inline-block px-4 py-2 border border-secondary rounded-full">
							<span className="text-primary text-medium">{t('business.dashboard.badge')}</span>
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

