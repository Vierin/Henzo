import LandingHeader from '@/components/LandingHeader';
import { LandingSpotlightSection } from '@/components/landingSpotlightSection';
import { LandingHeroSection } from '@/components/landing/landingHeroSection';
import { LandingPhoneShowcaseSection } from '@/components/landing/landingPhoneShowcaseSection';
import { LandingScrollReset } from '@/components/landing/landingScrollReset';
import { LandingStatement } from '@/components/landing/landingStatement';
import { QuickStartSection } from '@/components/landing/quickStartSection';
import { LandingPricingSection } from '@/components/landing/landingPricingSection';
import { LandingCtaSection } from '@/components/landing/landingCtaSection';
import { withLocale, type Locale } from '@/i18n/routing';

/** Shared B2B marketing landing (also served at `/business`). */
export function BusinessLandingView({ locale }: { locale: Locale }) {
  const businessHref = withLocale('/business', locale);

  return (
    <>
      <LandingScrollReset />
      <div className="min-h-screen overflow-x-clip bg-[#3F3287] font-wix-madefor-display text-[#3F3F3F]">
        <header className="absolute left-1/2 top-0 z-30 -translate-x-1/2 w-full max-w-6xl rounded-b-[1.35rem] bg-[#FDF5F0] sm:rounded-b-[1.75rem]">
          <LandingHeader
            homeHref={businessHref}
            sectionNavHref={businessHref}
          />
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
    </>
  );
}
