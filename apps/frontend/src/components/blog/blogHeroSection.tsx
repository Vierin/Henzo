import { ChaoticUnderline } from '@/components/landing/chaoticUnderline';
import Image from 'next/image';

export type BlogHeroCopy = {
  badge: string;
  titleBefore: string;
  titleAccent: string;
  titleAfter: string;
  subtitle: string;
};

type BlogHeroSectionProps = {
  copy: BlogHeroCopy;
};

export function BlogHeroSection({ copy }: BlogHeroSectionProps) {
  return (
    <section
      className="relative overflow-hidden bg-[#F4E6D9]"
      aria-labelledby="blog-hero-heading"
    >
      <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 pb-8 pt-10 sm:px-6 sm:pb-12 sm:pt-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8 lg:pb-12 lg:pt-12">
        <div className="relative z-[1] max-w-xl">
          <span className="inline-flex rounded-full bg-[#3F3287] px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-white">
            {copy.badge}
          </span>

          <h1
            id="blog-hero-heading"
            className="mt-5 text-[2.4rem] font-semibold leading-[1.08] tracking-tight text-[#3F3F3F] sm:text-[3.4rem] lg:text-[3.75rem]"
          >
            {copy.titleBefore}
            <span className="relative inline-block px-0.5">
              {copy.titleAccent}
              <ChaoticUnderline
                color="#F15942"
                className="pointer-events-none absolute -bottom-1 left-0 w-[108%] -translate-x-[4%] sm:-bottom-1.5"
              />
            </span>
            {copy.titleAfter}
          </h1>

          <p className="mt-5 max-w-md text-base leading-relaxed text-[#5A5A5A] sm:text-lg">
            {copy.subtitle}
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none lg:justify-self-end lg:translate-x-4 lg:scale-110 lg:origin-bottom-right">
          <Image
            src="/blog/blog-woman.webp"
            alt=""
            width={1200}
            height={1200}
            className="mx-auto h-auto w-full object-contain"
            sizes="(max-width: 1024px) 90vw, 620px"
            priority
          />
        </div>
      </div>
    </section>
  );
}
