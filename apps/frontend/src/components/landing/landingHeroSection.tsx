'use client';

import { ChaoticUnderline } from '@/components/landing/chaoticUnderline';
import { StoreBadgeLinks } from '@/components/landing/storeBadgeLinks';
import { useTranslation } from '@/contexts/LanguageContext';

const H = 'homepage.studio.hero';

type HeroCopy = {
  line1Lead: string;
  line1Highlight: string;
  line1Trail: string;
  line2Lead: string;
  line2Highlight: string;
  line2Trail: string;
  subtitle: string;
  startTrial: string;
  noCard: string;
  storeAppStore: string;
  storeGooglePlay: string;
};

export function LandingHeroSection() {
  const t = useTranslation();
  const {
    line1Lead,
    line1Highlight,
    line1Trail,
    line2Lead,
    line2Highlight,
    line2Trail,
    subtitle,
    startTrial,
    noCard,
    storeAppStore,
    storeGooglePlay,
  } = t(H) as unknown as HeroCopy;

  return (
    <section className="relative z-[8] min-h-screen bg-[#3F3287] pt-[5rem] md:pt-33">
      <div className="mx-auto w-full max-w-7xl overflow-hidden rounded-[1.75rem] bg-[#FDF6F0] shadow-[0_28px_90px_-20px_rgba(0,0,0,0.55)]">
        <div className="px-4 min-h-screen pb-[clamp(4rem,14vw,7rem)] pt-10 text-center sm:px-8 md:pt-14">
          <h1 className="mx-auto text-[1.85rem] leading-[1.1] tracking-tight text-[#3F3F3F] lg:text-[4.4rem]">
            <span className="block">
              {line1Lead}{' '}
              <span className="relative inline-block px-0.5">
                {line1Highlight}
                <ChaoticUnderline className="pointer-events-none absolute -bottom-1.5 left-[6%] w-[100%] -translate-x-[4%]" />
              </span>
              {line1Trail ? `\u00a0${line1Trail}` : ''}
            </span>
            <span className="mt-2 block sm:mt-3">
              {line2Lead}{' '}
              <span className="text-[#FF6B4A]">{line2Highlight}</span>
              {line2Trail ? `\u00a0${line2Trail}` : ''}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-[42rem] text-base leading-snug text-[#5C5C5C] sm:mt-8 sm:text-xl">
            {subtitle}
          </p>

          <div className="mx-auto mt-8 flex max-w-4xl flex-col items-center justify-center gap-6 sm:mt-10 sm:flex-row sm:gap-10">
            <div className="text-center sm:text-left">
              <p className="text-lg font-semibold leading-snug text-[#3F3F3F] sm:text-xl">
                {startTrial}
              </p>
              <p className="mt-1 text-sm text-[#878787]">{noCard}</p>
            </div>
            <StoreBadgeLinks
              id="get-app"
              className="mt-0 flex scroll-mt-28 flex-wrap items-center justify-center gap-4 sm:mt-0"
              appStoreLabel={storeAppStore}
              googlePlayLabel={storeGooglePlay}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
