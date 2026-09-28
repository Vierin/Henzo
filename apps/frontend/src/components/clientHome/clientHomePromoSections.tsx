'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Calendar,
  CreditCard,
  Users,
} from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';
import { withLocale } from '@/i18n/routing';
import { usePublicHeaderState } from '@/components/usePublicHeaderState';
import { StoreBadgeLinks } from '@/components/landing/storeBadgeLinks';
import { StudioPhoneFrame } from '@/components/landing/studioPhoneFrame';

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
    className: 'top-[8%] right-[-32%] lg:right-[-48%]',
  },
  {
    key: 'smartReminders',
    icon: Bell,
    color: 'bg-[#3F3287]',
    className: 'top-[30%] right-[-45%] lg:right-[-58%]',
  },
  {
    key: 'memberships',
    icon: CreditCard,
    color: 'bg-[#E86D4F]',
    className: 'top-[52%] right-[-43%] lg:right-[-56%]',
  },
  {
    key: 'trackActivity',
    icon: Activity,
    color: 'bg-[#3DBFBD]',
    className: 'top-[74%] right-[-30%] lg:right-[-46%]',
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

  return (
    <section className="bg-[#F9F4F0] px-4 pb-4 pt-1 sm:px-6 sm:pb-14 sm:pt-6">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2rem] bg-[#FDF5F0] px-4 py-4 sm:rounded-[2.5rem] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <div className="w-full max-w-md lg:basis-1/3">
              <h2 className="text-[2rem] font-bold leading-tight tracking-tight text-[#3F3F3F] sm:text-5xl lg:text-6xl">
                {title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-[#878787] sm:mt-4 sm:text-lg">
                {subtitle}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 sm:mt-8 sm:gap-4">
                <StoreBadgeLinks
                  appStoreLabel={storeAppStore}
                  googlePlayLabel={storeGooglePlay}
                  className="mt-0 flex flex-wrap items-center gap-3 sm:gap-4"
                  buttonClassName="inline-flex min-h-[44px] w-[148px] items-center justify-center gap-2 rounded-full border border-[#3F3F3F] bg-white px-5 py-2 text-sm font-semibold text-[#3F3F3F] transition hover:bg-white/80 sm:min-h-[48px] sm:w-[158px]"
                />
              </div>
            </div>

            <div className="relative mx-auto w-full sm:max-w-[270px] lg:basis-1/3 lg:max-w-[290px]">
              <StudioPhoneFrame className="w-full max-w-full" />

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

          {/* Feature chips: tablet only — absolute pills cover desktop, skip phone */}
          <div className="mt-8 hidden gap-3 sm:grid sm:grid-cols-2 lg:hidden">
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
  const locale = currentLocale as 'en' | 'ru' | 'vi' | 'pl' | 'cs' | 'es';
  const businessPath = withLocale('/business', locale);

  const titleLead = String(
    t(`${BUSINESS_BASE}.titleLead`) || 'Grow your studio with',
  );
  const titleBrand = String(t(`${BUSINESS_BASE}.titleBrand`) || 'Henzo');
  const subtitle = String(t(`${BUSINESS_BASE}.subtitle`));
  const cta = String(t(`${BUSINESS_BASE}.cta`));
  const noCard = String(
    t(`${BUSINESS_BASE}.noCreditCard`) || 'No credit card required',
  );
  const bookingsLabel = String(
    t(`${BUSINESS_BASE}.statBookings`) || 'New bookings',
  );
  const bookingsValue = String(t(`${BUSINESS_BASE}.statValue`) || '+28%');

  const featureIcons = {
    bookings: Calendar,
    clients: Users,
    schedule: BarChart3,
    reminders: Bell,
  } as const;

  return (
    <section className="bg-[#F9F4F0] px-4 pb-8 pt-2 sm:px-6 sm:pb-12">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[1.75rem] bg-[#E4E3F3] sm:rounded-[2.5rem]">
          <div className="grid items-stretch gap-0 lg:grid-cols-2 lg:gap-10 xl:gap-14">
            <div className="max-w-xl px-5 pb-0 pt-6 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
              <h2 className="text-[1.55rem] font-bold leading-tight tracking-tight text-[#3F3F3F] sm:text-4xl lg:text-[2.6rem]">
                {titleLead} <span className="text-[#5B45C6]">{titleBrand}</span>
              </h2>

              <p className="mt-2 max-w-md text-sm leading-relaxed text-[#878787] sm:mt-4 sm:text-lg">
                {subtitle}
              </p>

              <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 sm:mt-8 sm:grid-cols-4 sm:gap-3">
                {BUSINESS_FEATURES.map((key) => {
                  const Icon = featureIcons[key];
                  return (
                    <li
                      key={key}
                      className="flex flex-col items-start gap-1.5 sm:items-center sm:gap-2.5 sm:text-center"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DDD8E8] text-[#5B45C6] sm:h-11 sm:w-11">
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                      </span>
                      <span className="text-[12px] font-medium leading-snug text-[#878787] sm:text-sm">
                        {String(t(`${BUSINESS_BASE}.features.${key}`))}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 flex flex-col items-start gap-2 sm:mt-9 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <Link
                  href={businessPath}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#3F3287] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#342a73] sm:rounded-[18px] sm:px-6 sm:py-4 sm:text-base"
                >
                  {cta}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <span className="text-xs text-[#3F3F3F] sm:text-sm">
                  {noCard}
                </span>
              </div>
            </div>

            <div className="relative flex items-end justify-center sm:min-h-[24rem] lg:min-h-full">
              <Image
                src="/images/business-coach.png"
                alt=""
                width={900}
                height={700}
                className="relative z-0 h-auto w-full max-w-none object-contain object-bottom sm:w-[112%] sm:translate-y-1 lg:w-[118%] lg:max-h-[28rem]"
                sizes="(max-width: 1024px) 95vw, 50vw"
                priority={false}
              />

              <div className="absolute bottom-[38%] left-3 z-10 hidden w-[148px] overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_-12px_rgba(63,50,135,0.28)] sm:bottom-[44%] sm:left-5 sm:block sm:w-[168px] lg:left-2">
                <div className="px-3 pt-3 sm:px-3.5 sm:pt-3.5">
                  <p className="text-[11px] font-medium text-[#3F3F3F] sm:text-xs">
                    {bookingsLabel}
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#3F3F3F] sm:text-xl">
                    {bookingsValue}
                  </p>
                </div>
                <svg
                  viewBox="0 0 120 36"
                  preserveAspectRatio="none"
                  className="mt-2 block h-9 w-full"
                  aria-hidden
                >
                  <defs>
                    <linearGradient
                      id="bizBookingsFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#5B45C6"
                        stopOpacity="0.28"
                      />
                      <stop offset="100%" stopColor="#5B45C6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 28 C18 26 22 18 36 16 C50 14 54 22 68 14 C82 6 90 10 120 4 L120 36 L0 36 Z"
                    fill="url(#bizBookingsFill)"
                  />
                  <path
                    d="M0 28 C18 26 22 18 36 16 C50 14 54 22 68 14 C82 6 90 10 120 4"
                    fill="none"
                    stroke="#5B45C6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
