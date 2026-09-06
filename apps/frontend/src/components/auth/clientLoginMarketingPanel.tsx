import Image from 'next/image';
import { useTranslation } from '@/contexts/LanguageContext';

const CLIENT_IMAGE =
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=85';
const COACH_IMAGE =
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50f?w=600&q=85';

const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const WEEK_DATES = [12, 13, 14, 15, 16, 17, 18];

export function ClientLoginMarketingPanel() {
  const t = useTranslation();

  const headline = String(t('auth.marketing.headline'));
  const headlineGrow = String(t('auth.marketing.headlineGrow'));
  const clientLine = String(t('auth.marketing.clientLine'));
  const coachLine = String(t('auth.marketing.coachLine'));
  const capacity = String(t('auth.marketing.capacity'));
  const booked = String(t('auth.marketing.booked'));
  const waitlist = String(t('auth.marketing.waitlist'));

  return (
    <aside
      className="relative hidden min-h-screen overflow-hidden lg:block lg:w-1/2"
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, #E4F5C4 0%, #E4F5C4 48%, #F5CFC8 48%, #F5CFC8 100%)',
        }}
      />

      <div className="relative flex h-full flex-col justify-between px-10 py-12 xl:px-14">
        <div>
          <h2 className="max-w-md text-[2rem] font-bold leading-tight text-[#3F3287] xl:text-[2.35rem]">
            {headline}{' '}
            <span className="relative inline-block">
              {headlineGrow}
              <svg
                className="absolute -bottom-1 left-0 w-full"
                viewBox="0 0 120 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2 8C20 2 40 10 60 6C80 2 100 10 118 4"
                  stroke="#E86D4F"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h2>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <p className="mb-4 text-lg font-semibold text-[#3F3F3F]">
            {clientLine}
          </p>

          <div className="mb-6 flex gap-2">
            {WEEK_DAYS.map((day, i) => {
              const isActive = day === 'FRI';
              return (
                <div
                  key={day}
                  className={`flex flex-col items-center rounded-xl px-2.5 py-2 text-center text-[10px] font-semibold ${
                    isActive
                      ? 'bg-[#E86D4F] text-white'
                      : 'bg-white/70 text-[#878787]'
                  }`}
                >
                  <span>{day}</span>
                  <span className="mt-0.5 text-sm">{WEEK_DATES[i]}</span>
                </div>
              );
            })}
          </div>

          <div className="relative h-56 w-full">
            <Image
              src={CLIENT_IMAGE}
              alt=""
              fill
              sizes="400px"
              className="object-contain object-bottom"
            />
          </div>

          <div className="absolute right-0 top-24 w-44 rounded-2xl border border-white/60 bg-white/95 p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="relative flex h-14 w-14 items-center justify-center">
                <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    fill="none"
                    stroke="#F0EBE6"
                    strokeWidth="5"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    fill="none"
                    stroke="#E86D4F"
                    strokeWidth="5"
                    strokeDasharray="150.8"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-xs font-bold text-[#E86D4F]">
                  100%
                </span>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#878787]">
                  {capacity}
                </p>
                <p className="text-sm font-bold text-[#3F3F3F]">15 of 15</p>
                <p className="text-[10px] text-[#878787]">{booked}</p>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-[#878787]">{waitlist}</p>
          </div>

          <p className="mt-8 text-lg font-semibold text-[#3F3F3F]">
            {coachLine}
          </p>

          <div className="relative mt-2 h-48 w-full">
            <Image
              src={COACH_IMAGE}
              alt=""
              fill
              sizes="400px"
              className="object-contain object-bottom"
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
