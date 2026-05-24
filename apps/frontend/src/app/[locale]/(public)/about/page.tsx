import React from 'react';
import type { Metadata } from 'next';
import { buildStaticPageMetadata, resolveLocale } from '@/seo';
import { AboutHeroSection } from './components/AboutHeroSection';
import { OurStorySection } from './components/OurStorySection';
import { ValuesSection } from './components/ValuesSection';
import { CTASection } from './components/CTASection';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  return buildStaticPageMetadata('about', resolveLocale(raw));
}

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
