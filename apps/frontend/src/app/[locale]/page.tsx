import type { Metadata } from 'next';
import PublicHeader from '@/components/PublicHeader';
import { LandingSpotlightSection } from '@/components/landingSpotlightSection';
import { LandingHeroSection } from '@/components/landing/landingHeroSection';
import { LandingPhoneShowcaseSection } from '@/components/landing/landingPhoneShowcaseSection';
import { LandingStatement } from '@/components/landing/landingStatement';
import { QuickStartSection } from '@/components/landing/quickStartSection';
import { LandingPricingSection } from '@/components/landing/landingPricingSection';
import { buildStaticPageMetadata, resolveLocale } from '@/seo';
import { LandingCtaSection } from '@/components/landing/landingCtaSection';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  return buildStaticPageMetadata('home', resolveLocale(raw));
}

export default async function HomePage() {
  return (
    <div className="min-h-screen bg-[#3F3287] font-wix-madefor-display text-[#3F3F3F]">
      <header className="absolute left-1/2 top-0 z-30 -translate-x-1/2 w-full max-w-6xl rounded-b-[1.35rem] bg-[#FDF5F0] sm:rounded-b-[1.75rem]">
        <PublicHeader embedded />
      </header>

      <main className="w-full">
        <LandingHeroSection />
        <LandingPhoneShowcaseSection />
        <LandingStatement />
        <LandingSpotlightSection />
        <QuickStartSection />
        <LandingPricingSection />
        <LandingCtaSection />
      </main>
    </div>
  );
}
