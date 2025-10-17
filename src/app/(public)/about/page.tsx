import React from 'react';
import { seoConfig } from '@/constants/seoConfig';
import PublicHeader from '@/components/PublicHeader';
import { AboutHeroSection } from './components/AboutHeroSection';
import { OurStorySection } from './components/OurStorySection';
import { ValuesSection } from './components/ValuesSection';
import { CTASection } from './components/CTASection';

export const metadata = seoConfig.about;

export default function AboutPage() {
	return (
		<>
			<div className="min-h-screen flex flex-col bg-[#F8F5F2]">
				<main className="flex-1 bg-white">
					<AboutHeroSection />
					<OurStorySection />
					<ValuesSection />
					<CTASection />
				</main>
			</div>
		</>
	);
}
