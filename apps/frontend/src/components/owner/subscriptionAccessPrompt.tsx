'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/contexts/LanguageContext';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { ownerTheme } from '@/lib/owner/owner-theme';
import { fetchOwnerSubscription } from '@/lib/owner/fetch-subscription';

const TRIAL_KEY = 'henzo_studio_trial_notice';

export function SubscriptionAccessPrompt() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const subQuery = useQuery({
    queryKey: ['owner-subscription'],
    queryFn: fetchOwnerSubscription,
  });
  const sub = subQuery.data;
  const [open, setOpen] = useState<'paywall' | 'trial' | null>(null);

  useEffect(() => {
    if (!sub) return;
    if (sub.hasAccess === false) {
      setOpen('paywall');
      return;
    }
    if (sub.isTrial) {
      try {
        if (window.localStorage.getItem(TRIAL_KEY) === '1') return;
        window.localStorage.setItem(TRIAL_KEY, '1');
      } catch {
        return;
      }
      setOpen('trial');
    }
  }, [sub]);

  if (!open) return null;

  const paywall = open === 'paywall';
  const plansHref = withLocale('/salon-info/subscription', locale);
  const label = (key: string, fallback: string) => {
    const value = String(t(key) ?? '');
    return value && value !== key ? value : fallback;
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-[16px] bg-white p-5 shadow-lg"
      >
        <p className="text-lg font-bold" style={{ color: ownerTheme.text }}>
          {paywall
            ? label('owner.subscription.paywallTitle', 'Subscribe to continue')
            : label(
                'owner.subscription.trialBannerTitle',
                '3 months to explore Henzo',
              )}
        </p>
        <p className="mt-2 text-sm" style={{ color: ownerTheme.textSecondary }}>
          {paywall
            ? label(
                'owner.subscription.paywallBody',
                'Your trial has ended. Pay for a plan to add new classes.',
              )
            : label(
                'owner.subscription.trialBannerBody',
                'Studio is yours for 3 months, so you can get to know the app and see how it fits your studio.',
              )}
        </p>
        <div className="mt-4 flex gap-2">
          {!paywall ? (
            <button
              type="button"
              className="w-full rounded-[12px] px-4 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: ownerTheme.accent }}
              onClick={() => setOpen(null)}
            >
              {label('common.ok', 'OK')}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="flex-1 rounded-[12px] border px-4 py-3 text-sm font-semibold"
                style={{
                  borderColor: ownerTheme.borderSoft,
                  color: ownerTheme.text,
                }}
                onClick={() => setOpen(null)}
              >
                {label('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                className="flex-1 rounded-[12px] px-4 py-3 text-sm font-semibold text-white"
                style={{ backgroundColor: ownerTheme.accent }}
                onClick={() => {
                  setOpen(null);
                  router.push(plansHref);
                }}
              >
                {label('owner.subscription.paywallCta', 'See plans')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
