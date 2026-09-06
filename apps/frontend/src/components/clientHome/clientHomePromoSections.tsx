'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  Bell,
  Calendar,
  Check,
  CreditCard,
  QrCode,
} from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { withLocale } from '@/i18n/routing';
import { usePublicHeaderState } from '@/components/usePublicHeaderState';
import { StoreBadgeLinks } from '@/components/landing/storeBadgeLinks';
import { StudioPhoneFrame } from '@/components/landing/studioPhoneFrame';
import { playStoreUrl } from '@/constants/appStores';

const APP_BASE = 'homepage.client.appPromo';
const BUSINESS_BASE = 'homepage.client.businessPromo';

type PillConfig = {
  key: string;
  icon: typeof Calendar;
  color: string;
  className: string;
};

const APP_PILLS: PillConfig[] = [
  {
    key: 'easyBooking',
    icon: Calendar,
    color: 'bg-[#5B8DEF]',
    className: 'top-[8%] right-[-32%]',
  },
  {
    key: 'smartReminders',
    icon: Bell,
    color: 'bg-[#3F3287]',
    className: 'top-[30%] right-[-45%]',
  },
  {
    key: 'memberships',
    icon: CreditCard,
    color: 'bg-[#E86D4F]',
    className: 'top-[52%] right-[-43%]',
  },
  {
    key: 'trackActivity',
    icon: Activity,
    color: 'bg-[#3DBFBD]',
    className: 'top-[74%] right-[-30%]',
  },
];

const BUSINESS_FEATURES = [
  'bookings',
  'clients',
  'schedule',
  'reminders',
] as const;

function FeaturePill({
  label,
  icon: Icon,
  color,
  className,
}: {
  label: string;
  icon: typeof Calendar;
  color: string;
  className: string;
}) {
  return (
    <div
      className={`absolute z-10 hidden w-[max(20rem,50%)] items-center gap-2.5 rounded-xl bg-white p-2 sm:flex sm:w-auto ${className}`}
    >
      <span
        className={`flex h-10 aspect-square shrink-0 items-center justify-center rounded-full ${color} text-white`}
      >
        <Icon className="h-5 aspect-square" aria-hidden />
      </span>
      <span className="text-sm font-medium text-[#3F3F3F]">{label}</span>
    </div>
  );
}

export function ClientHomeAppPromoSection() {
  const t = useTranslation();
  const title = String(t(`${APP_BASE}.title`));
  const subtitle = String(t(`${APP_BASE}.subtitle`));
  const storeAppStore = String(t(`${APP_BASE}.storeAppStore`));
  const storeGooglePlay = String(t(`${APP_BASE}.storeGooglePlay`));
  const qrLabel = String(t(`${APP_BASE}.qrLabel`));

  return (
    <section className="bg-[#F9F4F0] px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-6">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2rem] bg-[#FDF5F0] px-5 py-8 sm:rounded-[2.5rem] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="flex items-center justify-between">
            <div className="max-w-md basis-1/3">
              <h2 className="text-[2rem] font-bold leading-tight tracking-tight text-[#3F3F3F] sm:text-6xl">
                {title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-[#878787] sm:mt-4 sm:text-lg">
                {subtitle}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-4 sm:mt-8">
                <StoreBadgeLinks
                  appStoreLabel={storeAppStore}
                  googlePlayLabel={storeGooglePlay}
                  className="mt-0 flex flex-wrap items-center gap-3 sm:gap-4"
                  buttonClassName="inline-flex min-h-[44px] w-[148px] items-center justify-center gap-2 rounded-full border border-[#3F3F3F] bg-white px-5 py-2 text-sm font-semibold text-[#3F3F3F] transition hover:bg-white/80 sm:min-h-[48px] sm:w-[158px]"
                />
              </div>
            </div>

            <div className="relative mx-auto w-full basis-1/3">
              <StudioPhoneFrame className="max-w-[250px] sm:max-w-[270px] lg:max-w-[290px]" />

              {APP_PILLS.map(({ key, icon, color, className }) => (
                <FeaturePill
                  key={key}
                  label={String(t(`${APP_BASE}.pills.${key}`))}
                  icon={icon}
                  color={color}
                  className={className}
                />
              ))}
            </div>

            <div className="hidden lg:block" aria-hidden />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:hidden">
            {APP_PILLS.map(({ key, icon: Icon, color }) => (
              <div
                key={key}
                className="flex items-center gap-3 rounded-2xl border border-[#F0EBE6] bg-white px-4 py-3"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color} text-white`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-sm font-medium text-[#3F3F3F]">
                  {String(t(`${APP_BASE}.pills.${key}`))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ClientHomeBusinessPromoSection() {
  const t = useTranslation();
  const { currentLocale } = usePublicHeaderState();
  const locale = currentLocale as 'en' | 'ru' | 'vi';
  const businessPath = withLocale('/business', locale);

  const title = String(t(`${BUSINESS_BASE}.title`));
  const subtitle = String(t(`${BUSINESS_BASE}.subtitle`));
  const cta = String(t(`${BUSINESS_BASE}.cta`));

  return (
    <section className="bg-[#F9F4F0] px-4 pb-10 pt-2 sm:px-6 sm:pb-12">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2rem] bg-[#EDE8F5] px-5 py-5 sm:rounded-[2.5rem] sm:px-8 sm:py-6 lg:px-10 lg:py-7">
          <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-8 xl:gap-10">
            <div className="max-w-lg">
              <h2 className="text-[1.75rem] font-bold leading-tight tracking-tight text-[#3F3F3F] sm:text-4xl">
                {title}
              </h2>
              <p className="mt-2 text-base leading-relaxed text-[#878787] sm:mt-3 sm:text-lg">
                {subtitle}
              </p>

              <ul className="mt-4 space-y-2 sm:mt-5 sm:space-y-2.5">
                {BUSINESS_FEATURES.map((key) => (
                  <li key={key} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3F3287] text-white">
                      <Check
                        className="h-3.5 w-3.5"
                        strokeWidth={3}
                        aria-hidden
                      />
                    </span>
                    <span className="text-base font-medium text-[#3F3F3F]">
                      {String(t(`${BUSINESS_BASE}.features.${key}`))}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={businessPath}
                className="mt-5 inline-flex items-center rounded-full bg-[#3F3287] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#342a73] sm:mt-6 sm:px-8 sm:py-3.5 sm:text-base"
              >
                {cta}
              </Link>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <Image
                src="/images/business.webp"
                alt=""
                width={1200}
                height={900}
                className="mx-auto h-auto max-h-[14rem] w-auto max-w-full object-contain sm:max-h-[18rem] lg:max-h-[20rem]"
                sizes="(max-width: 1024px) 90vw, 50vw"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
