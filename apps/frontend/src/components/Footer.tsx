'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AppleStoreIcon,
  GooglePlayIcon,
} from '@/components/landing/storeIcons';
import { appStoreUrl, playStoreUrl } from '@/constants/appStores';
import { useTranslation, useLanguage } from '@/contexts/LanguageContext';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';

function FacebookIconFilled({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073c0 6.019 4.388 10.993 10.125 11.854v-8.437H7.078V12.07h3.047V9.457c0-3.022 1.792-4.69 4.533-4.69 1.312 0 2.686.236 2.686.236v2.97H15.83c-1.49 0-1.955.931-1.955 1.887v2.21h3.328l-.532 3.42h-2.796v8.437C19.612 23.066 24 18.092 24 12.073z"
      />
    </svg>
  );
}

function InstagramIconFilled({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M7.75 2h8.5A5.756 5.756 0 0 1 22 7.75v8.5A5.756 5.756 0 0 1 16.25 22h-8.5A5.756 5.756 0 0 1 2 16.25v-8.5A5.756 5.756 0 0 1 7.75 2zm0 1.8A3.955 3.955 0 0 0 3.8 7.75v8.5A3.955 3.955 0 0 0 7.75 20.2h8.5a3.955 3.955 0 0 0 3.95-3.95v-8.5a3.955 3.955 0 0 0-3.95-3.95h-8.5zm8.9 1.35a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4z"
      />
    </svg>
  );
}

export default function Footer() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const locale = extractLocaleFromPath(pathname) ?? language;
  const t = useTranslation();
  const homePath = withLocale('/', (locale as Locale) || 'en');
  const navBenefits = String(t('homepage.studio.footer.navBenefits'));
  const navPricing = String(t('homepage.studio.footer.navPricing'));
  const navHowItWorks = String(t('homepage.studio.footer.navHowItWorks'));
  const blogPath = withLocale('/blog', 'en');
  const ctaTitle = String(t('homepage.studio.footer.ctaTitle'));

  return (
    <footer
      className="bg-[#F9F4F0] px-3 py-4 sm:px-6 sm:py-8"
      suppressHydrationWarning
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex sm:flex-row flex-col gap-4 sm:gap-10 justify-between items-end">
          <div>
            <div className="">
              <Link
                href={homePath}
                className="inline-flex items-center"
                aria-label="Henzo home"
              >
                <Image
                  src="/logo.png"
                  alt="Henzo"
                  width={166}
                  height={54}
                  className="h-[54px] w-auto object-contain"
                />
              </Link>
            </div>

            <div className="mt-8 sm:pl-12">
              <p className="sm:text-[1rem] text-[0.9rem] text-[#3F3F3F] -mt-9 sm:-mt-2 sm:pl-0 pl-12">
                Run your classes.{' '}
                <b className="text-[#F15942]">We’ll run your system.</b>
              </p>
              <nav
                aria-label="Footer"
                className="mt-8 flex flex-wrap items-center gap-x-9 gap-y-3 text-[1.02rem] font-medium text-[#3F3F3F]"
              >
                <Link
                  href={`${homePath}#benefits`}
                  className="transition hover:text-[#E86D4F]"
                >
                  {navBenefits}
                </Link>
                <Link
                  href={`${homePath}#pricing`}
                  className="transition hover:text-[#E86D4F]"
                >
                  {navPricing}
                </Link>
                <Link
                  href={`${homePath}#how-it-works`}
                  className="transition hover:text-[#E86D4F]"
                >
                  {navHowItWorks}
                </Link>
                <Link
                  href={blogPath}
                  className="transition hover:text-[#E86D4F]"
                >
                  {t('footer.blog')}
                </Link>
              </nav>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="https://www.facebook.com/profile.php?id=61581892591997"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="inline-flex h-10 w-14 items-center justify-center rounded-full border border-[#E4E7ED] bg-white text-[#3F3F3F] transition hover:text-[#E86D4F]"
                >
                  <FacebookIconFilled className="w-[1.2rem] aspect-square text-[#3F3F3F]" />
                </a>
                <a
                  href="https://www.instagram.com/henzo.app/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="inline-flex h-10 w-14 items-center justify-center rounded-full border border-[#E4E7ED] bg-white text-[#3F3F3F] transition hover:text-[#E86D4F]"
                >
                  <InstagramIconFilled className="w-[1.2rem] aspect-square text-[#3F3F3F]" />
                </a>
                <a
                  href="mailto:hello@henzo.app"
                  className="ml-2 text-[1.06rem] font-medium text-[#3F3F3F] transition hover:text-[#E86D4F]"
                >
                  hello@henzo.app
                </a>
              </div>
            </div>
          </div>
          <div className="md:pb-1">
            <div className="rounded-3xl bg-white px-9 py-6 pr-8 hidden sm:flex items-center justify-between gap-6">
              <p className="text-[1.5rem] leading-[1.03] tracking-tight text-[#3B3B3F]">
                {ctaTitle}
              </p>
              <div className="flex items-center gap-3">
                <a
                  href={appStoreUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="App Store"
                  className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-full border border-[#C8CBD3] text-black transition hover:bg-[#faf8f5]"
                >
                  <AppleStoreIcon className="h-5 w-5" />
                </a>
                <a
                  href={playStoreUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Google Play"
                  className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-full border border-[#C8CBD3] text-black transition hover:bg-[#faf8f5]"
                >
                  <GooglePlayIcon className="h-5 w-5" />
                </a>
              </div>
            </div>
            <p className="sm:mt-8 text-[1rem] font-medium text-[#3F3F3F] text-left">
              {t('footer.allRightsReserved')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
