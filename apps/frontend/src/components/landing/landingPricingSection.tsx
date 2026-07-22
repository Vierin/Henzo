'use client';

import { ChaoticUnderline } from '@/components/landing/chaoticUnderline';
import { StoreBadgeLinks } from '@/components/landing/storeBadgeLinks';
import { useTranslation } from '@/contexts/LanguageContext';
import Image from 'next/image';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

const BASE = 'homepage.studio.pricing';
/** ChaoticUnderline viewBox width / height — SVG height scales with word width. */
const UNDERLINE_ASPECT = 251 / 12;
/** Push stroke below baseline as a fraction of computed SVG height. */
const UNDERLINE_DROP_RATIO = 0.42;

type PricingPlan = {
  name: string;
  subtitle: string;
  price: string;
  priceSub: string;
  features: string[];
};

function parsePlans(raw: unknown): PricingPlan[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (x): x is PricingPlan =>
      x !== null &&
      typeof x === 'object' &&
      'name' in x &&
      'subtitle' in x &&
      'price' in x &&
      'priceSub' in x &&
      'features' in x &&
      typeof (x as PricingPlan).name === 'string' &&
      typeof (x as PricingPlan).subtitle === 'string' &&
      typeof (x as PricingPlan).price === 'string' &&
      typeof (x as PricingPlan).priceSub === 'string' &&
      Array.isArray((x as PricingPlan).features) &&
      (x as PricingPlan).features.every((f) => typeof f === 'string'),
  );
}

export function LandingPricingSection() {
  const t = useTranslation();
  const accentRef = useRef<HTMLSpanElement>(null);
  const [underlineBottomPx, setUnderlineBottomPx] = useState(4);

  const titleLine1 = String(t(`${BASE}.titleLine1`));
  // Empty i18n values fall back to the key path — treat that as ''.
  const resolveOptional = (key: string) => {
    const raw = t(key);
    return typeof raw === 'string' && raw !== key ? raw : '';
  };
  const titleLine2Before = resolveOptional(`${BASE}.titleLine2Before`);
  const titleLine2Accent = String(t(`${BASE}.titleLine2Accent`));
  const titleLine2After = resolveOptional(`${BASE}.titleLine2After`);
  const appStoreLabel = String(t(`${BASE}.storeAppStore`));
  const googlePlayLabel = String(t(`${BASE}.storeGooglePlay`));
  const currencyRaw = t(`${BASE}.currency`);
  const currency =
    typeof currencyRaw === 'string' && currencyRaw !== `${BASE}.currency`
      ? currencyRaw
      : 'VND';
  const plans = useMemo(() => parsePlans(t(`${BASE}.plans`)), [t]);

  useLayoutEffect(() => {
    const el = accentRef.current;
    if (!el) {
      return;
    }

    const update = () => {
      const wordWidth = el.offsetWidth;
      if (wordWidth <= 0) {
        return;
      }
      // SVG is w-[103%] of the accent span → taller for longer locales (ru).
      const svgHeight = (wordWidth * 1.03) / UNDERLINE_ASPECT;
      setUnderlineBottomPx(
        Math.max(2, Math.round(svgHeight * UNDERLINE_DROP_RATIO)),
      );
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [titleLine2Accent]);

  if (plans.length === 0) {
    return null;
  }

  return (
    <section
      id="pricing"
      className="bg-[#F9F4F0] sm:min-h-[max(100svh,1000px)] pt-[15rem] px-6 pb-16 sm:pt-20 md:px-10 md:pb-20 md:pt-28 lg:pt-36"
    >
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-[#33363F]">
          <span className="block text-[2.4rem] sm:text-[4.4rem] tracking-tight leading-[1]">
            {titleLine1}
          </span>
          <span className="block text-[2.4rem] sm:text-[4.4rem] font-medium leading-[1] tracking-tight text-[#F15942]">
            {titleLine2Before}
            <span ref={accentRef} className="relative inline-block px-0.5">
              {titleLine2Accent}
              <span
                className="pointer-events-none absolute left-[3%] w-[103%] -translate-x-[4%]"
                style={{ bottom: `-${underlineBottomPx}px` }}
                aria-hidden
              >
                <ChaoticUnderline color="#4D39A8" className="block w-full" />
              </span>
            </span>
            {titleLine2After}
          </span>
        </h2>

        <div className="mt-15 grid gap-7 md:grid-cols-2 lg:grid-cols-3 md:gap-8 lg:gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className="rounded-[1.4rem] bg-gradient-to-b from-[#F15942] to-[#FCF3EC] p-[1px]"
            >
              <article
                className={`flex h-full flex-col rounded-[calc(1.4rem-1px)] p-5 pb-11 ${
                  index === 0 ? 'bg-[#fdf8f4]' : 'bg-white'
                }`}
              >
                <div className="flex items-start gap-6 flex align-center">
                  <div className="aspect-square w-[4rem] shrink-0 rounded-2xl bg-[#F15942]" />
                  <div className="font-medium">
                    <h3 className="flex items-center gap-2 text-[1.5rem] leading-tight text-[#3F3F3F]">
                      {plan.name}
                      <Image
                        src={
                          index === 0
                            ? '/images/icon-shoose.png'
                            : '/images/icon-rocket.png'
                        }
                        alt={index === 0 ? 'Shoes icon' : 'Rocket icon'}
                        width={22}
                        height={22}
                      />
                    </h3>
                    <p className="text-[1rem] leading-tight text-[#33363F]">
                      {plan.subtitle}
                    </p>
                  </div>
                </div>

                <div className="my-5 sm:my-10 border-t border-[#3F3F3F]" />

                <div className="">
                  <p className="text-[2.4rem] sm:text-[3.2rem] lg:text-[2.8rem] font-medium leading-none tracking-tight text-[#3F3F3F]">
                    {plan.price}{' '}
                    <span className="text-[1.4rem] sm:text-[1.8rem] lg:text-[1.6rem] text-[#3F3F3F]">
                      {currency}
                    </span>
                  </p>
                  {plan.priceSub ? (
                    <p className="mt-3 text-[1rem] text-[#3F3F3F]">
                      {plan.priceSub}
                    </p>
                  ) : null}
                </div>

                <ul className="mt-5 sm:mt-13 flex-1 space-y-4">
                  {plan.features.map((feature) => (
                    <li
                      key={`${plan.name}-${feature}`}
                      className="flex items-start gap-3 text-[1.03rem] leading-snug text-[#151515]"
                    >
                      <Image
                        className="pt-0.5"
                        src="/images/icon-fire.png"
                        alt="Fire"
                        width={16}
                        height={16}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          ))}
        </div>

        <StoreBadgeLinks
          className="mt-12 flex flex-wrap items-center justify-center gap-4 md:mt-20 md:gap-10"
          buttonClassName="bg-white"
          appStoreLabel={appStoreLabel}
          googlePlayLabel={googlePlayLabel}
        />
      </div>
    </section>
  );
}
