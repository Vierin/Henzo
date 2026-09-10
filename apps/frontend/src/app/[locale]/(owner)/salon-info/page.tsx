'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Building2,
  CalendarDays,
  CalendarCheck,
  ChevronRight,
  CreditCard,
  Dumbbell,
  Globe,
  HelpCircle,
  Shield,
  Star,
  FileText,
  Users,
  User,
} from 'lucide-react';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import {
  BookingPeriodModal,
  ClientNotificationsModal,
  OwnerFeedbackModal,
  ToggleSwitch,
  clientRemindersSummary,
  extractBookingPeriodDays,
} from '@/components/owner/ownerSettingsStudioModals';
import { useTranslation } from '@/contexts/LanguageContext';
import { fetchOwnerAccountProfile } from '@/lib/owner/fetch-account';
import { fetchTrainings } from '@/lib/owner/fetch-trainings';
import { fetchStaff } from '@/lib/owner/fetch-staff';
import {
  fetchOwnerSubscription,
  fetchOwnerUsage,
  planBadgeLabel,
} from '@/lib/owner/fetch-subscription';
import type { ClientReminderRule } from '@/lib/owner/types';
import { ownerTheme } from '@/lib/owner/owner-theme';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-2 mt-5 px-0.5 text-[13px] font-medium uppercase tracking-[0.04em]"
      style={{ color: ownerTheme.textSecondary }}
    >
      {children}
    </p>
  );
}

function SettingsTile({
  href,
  onClick,
  icon,
  title,
  trailing,
  trailingNode,
  hideChevron,
  className: extraClassName,
}: {
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  title: string;
  trailing?: string | null;
  trailingNode?: React.ReactNode;
  hideChevron?: boolean;
  /** e.g. `md:hidden` — hide on desktop when item lives in sidebar */
  className?: string;
}) {
  const className = [
    'flex w-full items-center gap-3 rounded-[14px] bg-white px-3.5 py-3.5 text-left transition hover:bg-[#FFFCF9]',
    extraClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const body = (
    <>
      <span
        className="flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: ownerTheme.accent }}
      >
        {icon}
      </span>
      <span
        className="min-w-0 flex-1 text-[15px] font-medium"
        style={{ color: ownerTheme.text }}
      >
        {title}
      </span>
      {trailingNode ??
        (trailing ? (
          <span
            className="max-w-[40%] truncate text-sm"
            style={{ color: ownerTheme.textSecondary }}
          >
            {trailing}
          </span>
        ) : null)}
      {!hideChevron ? (
        <ChevronRight
          className="h-5 w-5 shrink-0"
          style={{ color: ownerTheme.textSecondary }}
        />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}

function UsageChip({
  label,
  used,
  limit,
  icon,
}: {
  label: string;
  used: number;
  limit: number | null | undefined;
  icon: React.ReactNode;
}) {
  if (limit == null || limit <= 0) return null;
  const ratio = Math.min(1, used / limit);
  return (
    <div
      className="min-w-0 flex-1 rounded-[12px] px-4 py-3 text-white"
      style={{ backgroundColor: ownerTheme.accent }}
    >
      <div className="flex items-center gap-1.5">
        <span className="shrink-0 text-white">{icon}</span>
        <span className="min-w-0 truncate text-sm font-medium">{label}</span>
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {used}/{limit}
        </span>
      </div>
    </div>
  );
}

export default function OwnerSettingsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslation();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const { studio, patchStudio } = useOwnerStudio();

  const [bookingOpen, setBookingOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  /** Local override while PUT is in flight — toggle flips instantly. */
  const [autoConfirmOverride, setAutoConfirmOverride] = useState<
    boolean | null
  >(null);
  const autoConfirmReqRef = useRef(0);

  const profileQuery = useQuery({
    queryKey: ['owner-account-profile'],
    queryFn: fetchOwnerAccountProfile,
  });

  const displayName =
    profileQuery.data?.name?.trim() ||
    profileQuery.data?.email?.split('@')[0] ||
    'Owner';
  const avatarUrl = profileQuery.data?.avatarUrl;

  const trainingsQuery = useQuery({
    queryKey: ['owner-trainings-count', studio?.id],
    queryFn: () => fetchTrainings(studio!.id),
    enabled: Boolean(studio?.id),
  });

  const staffQuery = useQuery({
    queryKey: ['owner-staff-count', studio?.id],
    queryFn: () => fetchStaff(studio!.id),
    enabled: Boolean(studio?.id),
  });

  const subQuery = useQuery({
    queryKey: ['owner-subscription'],
    queryFn: fetchOwnerSubscription,
  });

  const usageQuery = useQuery({
    queryKey: ['owner-usage'],
    queryFn: fetchOwnerUsage,
  });

  const path = (p: string) => withLocale(p, locale);

  const bookingPeriodDays = useMemo(
    () => extractBookingPeriodDays(studio),
    [studio],
  );

  const serverAutoConfirm =
    studio?.autoConfirmBookings == null
      ? true
      : Boolean(studio.autoConfirmBookings);
  const autoConfirm = autoConfirmOverride ?? serverAutoConfirm;

  const remindersLabel = clientRemindersSummary(studio);

  const trainingsCount = trainingsQuery.data?.length ?? 0;
  const staffCount = staffQuery.data?.length ?? 0;
  const planLabel = planBadgeLabel(subQuery.data ?? null);
  const usage = usageQuery.data;

  const onLanguage = () => {
    const next = locale === 'ru' ? 'en' : 'ru';
    router.push(withLocale(pathname, next as Locale));
  };

  const onToggleAutoConfirm = (next: boolean) => {
    if (!studio) return;
    const prev = autoConfirm;
    const req = ++autoConfirmReqRef.current;
    setAutoConfirmOverride(next);
    void patchStudio({ autoConfirmBookings: next })
      .then(() => {
        if (req !== autoConfirmReqRef.current) return;
        setAutoConfirmOverride(null);
      })
      .catch(() => {
        if (req !== autoConfirmReqRef.current) return;
        setAutoConfirmOverride(prev);
      });
  };

  const onSaveBookingPeriod = async (days: number) => {
    if (!studio) return;
    setSavingBooking(true);
    try {
      await patchStudio({
        reminderSettings: {
          ...(studio.reminderSettings ?? {}),
          bookingPeriodDays: days,
        },
      });
      setBookingOpen(false);
    } finally {
      setSavingBooking(false);
    }
  };

  const onSaveClientReminders = async (rules: ClientReminderRule[]) => {
    if (!studio) return;
    setSavingNotif(true);
    try {
      await patchStudio({
        reminderSettings: {
          ...(studio.reminderSettings ?? {}),
          clientReminders: rules,
        },
      });
      setNotifOpen(false);
    } finally {
      setSavingNotif(false);
    }
  };

  const hasUsage =
    (usage?.classesLimit != null && usage.classesLimit > 0) ||
    (usage?.trainersLimit != null && usage.trainersLimit > 0);

  return (
    <div className="mx-auto w-full max-w-2xl pb-8 lg:max-w-3xl">
      <h1
        className="text-2xl font-bold tracking-tight"
        style={{ color: ownerTheme.text }}
      >
        Settings
      </h1>

      {/* Account + plan/usage — one composition on desktop */}
      <div className="mt-4 space-y-2.5 md:space-y-0 md:overflow-hidden md:rounded-[16px] md:bg-white">
        <button
          type="button"
          onClick={() => router.push(path('/salon-info/account'))}
          className="flex w-full items-center gap-3 rounded-[14px] bg-white px-3.5 py-3.5 text-left transition hover:bg-[#FFFCF9] md:rounded-none md:hover:bg-[#FFFCF9]"
        >
          <span
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-full"
            style={{ backgroundColor: ownerTheme.bgSoft }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-4 w-4" style={{ color: ownerTheme.text }} />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className="block truncate text-[16px] font-bold"
              style={{ color: ownerTheme.text }}
            >
              {displayName}
            </span>
            <span
              className="mt-0.5 block truncate text-sm font-medium"
              style={{ color: ownerTheme.textSecondary }}
            >
              Owner · {studio?.name || 'Studio'}
            </span>
            <span
              className="mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold md:hidden"
              style={{
                backgroundColor: 'rgba(194, 246, 0, 0.4)',
                color: ownerTheme.text,
              }}
            >
              {planLabel}
            </span>
          </span>
          <ChevronRight
            className="h-5 w-5 shrink-0"
            style={{ color: ownerTheme.textSecondary }}
          />
        </button>

        {hasUsage ? (
          <div className="flex gap-2 md:hidden">
            <UsageChip
              label="Classes this month"
              used={usage?.classesUsed ?? 0}
              limit={usage?.classesLimit}
              icon={<UsageCalendarIcon />}
            />
            <UsageChip
              label="Trainers"
              used={usage?.trainersUsed ?? 0}
              limit={usage?.trainersLimit}
              icon={<UsagePeopleIcon />}
            />
          </div>
        ) : null}

        <div
          className="hidden border-t px-4 pb-4 pt-3 md:block"
          style={{ borderColor: ownerTheme.borderSoft }}
        >
          <Link
            href={path('/salon-info/subscription')}
            className="flex items-center gap-2 rounded-[12px] py-1 transition hover:opacity-90"
          >
            <span
              className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: 'rgba(194, 246, 0, 0.4)',
                color: ownerTheme.text,
              }}
            >
              {planLabel}
            </span>
            <span
              className="text-sm font-medium"
              style={{ color: ownerTheme.textSecondary }}
            >
              Subscription & billing
            </span>
            <ChevronRight
              className="ml-auto h-4 w-4 shrink-0"
              style={{ color: ownerTheme.textSecondary }}
            />
          </Link>

          {hasUsage ? (
            <div className="mt-3 flex gap-2">
              <UsageChip
                label="Classes this month"
                used={usage?.classesUsed ?? 0}
                limit={usage?.classesLimit}
                icon={<UsageCalendarIcon />}
              />
              <UsageChip
                label="Trainers"
                used={usage?.trainersUsed ?? 0}
                limit={usage?.trainersLimit}
                icon={<UsagePeopleIcon />}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Mobile-only: subscription still a list tile */}
      <div className="md:hidden">
        <SectionLabel>Payments</SectionLabel>
        <div className="space-y-2">
          <SettingsTile
            href={path('/salon-info/subscription')}
            icon={<CreditCard className="h-3.5 w-3.5" />}
            title="Subscription & billing"
          />
        </div>
      </div>

      <SectionLabel>Studio</SectionLabel>
      <div className="space-y-2">
        <SettingsTile
          href={path('/salon-info/studio')}
          icon={<Building2 className="h-3.5 w-3.5" />}
          title="Studio profile"
          trailing={studio?.name || undefined}
        />
        <SettingsTile
          onClick={() => setBookingOpen(true)}
          icon={<CalendarDays className="h-3.5 w-3.5" />}
          title="Booking period"
          trailing={`${bookingPeriodDays} days`}
        />
        <SettingsTile
          icon={<CalendarCheck className="h-3.5 w-3.5" />}
          title="Auto-confirm bookings"
          hideChevron
          trailingNode={
            <ToggleSwitch
              checked={autoConfirm}
              disabled={!studio}
              onChange={onToggleAutoConfirm}
            />
          }
        />
        <SettingsTile
          onClick={() => setNotifOpen(true)}
          icon={<Bell className="h-3.5 w-3.5" />}
          title="Client notifications"
          trailing={remindersLabel}
        />
        <SettingsTile
          href={path('/trainings')}
          icon={<Dumbbell className="h-3.5 w-3.5" />}
          title="Trainings"
          trailing={String(trainingsCount)}
          className="md:hidden"
        />
        <SettingsTile
          href={path('/staff')}
          icon={<Users className="h-3.5 w-3.5" />}
          title="Team"
          trailing={String(staffCount)}
          className="md:hidden"
        />
        <SettingsTile
          href={path('/salon-info/reviews')}
          icon={<Star className="h-3.5 w-3.5" />}
          title="Reviews"
        />
      </div>

      <SectionLabel>App</SectionLabel>
      <div className="space-y-2">
        <SettingsTile
          onClick={onLanguage}
          icon={<Globe className="h-3.5 w-3.5" />}
          title="Change language"
          trailing={locale.toUpperCase()}
          className="md:hidden"
        />
        <SettingsTile
          href={path('/privacy-policy')}
          icon={<Shield className="h-3.5 w-3.5" />}
          title="Privacy policy"
        />
        <SettingsTile
          href={path('/terms-of-service')}
          icon={<FileText className="h-3.5 w-3.5" />}
          title="Terms of use"
        />
        <SettingsTile
          onClick={() => setFeedbackOpen(true)}
          icon={<HelpCircle className="h-3.5 w-3.5" />}
          title="Help & Feedback"
        />
      </div>

      <BookingPeriodModal
        open={bookingOpen}
        initialDays={bookingPeriodDays}
        saving={savingBooking}
        onClose={() => setBookingOpen(false)}
        onSave={onSaveBookingPeriod}
      />
      <ClientNotificationsModal
        open={notifOpen}
        studio={studio}
        saving={savingNotif}
        onClose={() => setNotifOpen(false)}
        onSave={onSaveClientReminders}
      />
      <OwnerFeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        profile={profileQuery.data ?? null}
        copy={{
          title: t('owner.feedback.title') || 'Need help?',
          subtitle:
            t('owner.feedback.subtitle') ||
            'Ask a question or describe your issue',
          placeholder:
            t('owner.feedback.placeholder') ||
            'Describe your question or issue...',
          send: t('owner.feedback.send') || 'Send',
          sending: t('owner.feedback.sending') || 'Sending...',
          tooShort:
            t('owner.feedback.pleaseEnterMessage') ||
            'Please enter at least 10 characters',
          emailMissing: 'Your account email is missing',
          thankYou:
            t('owner.feedback.thankYou') || 'Thanks! We will help you soon.',
          failed:
            t('owner.feedback.failedToSend') ||
            'Failed to send your message. Please try again.',
        }}
      />
    </div>
  );
}

/** Mobile `icon-calendar.svg` — white stroke for usage chips */
function UsageCalendarIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 13 12" fill="none" aria-hidden>
      <path
        d="M0.5 4.77778H12.5M3.16667 0.5V1.72222M9.83333 0.5V1.72222M2.63333 11.5H10.3667C11.1134 11.5 11.4868 11.5 11.772 11.3668C12.0229 11.2496 12.2269 11.0626 12.3547 10.8327C12.5 10.5712 12.5 10.2289 12.5 9.54444V3.67778C12.5 2.99327 12.5 2.65101 12.3547 2.38957C12.2269 2.15959 12.0229 1.97261 11.772 1.85544C11.4868 1.72222 11.1134 1.72222 10.3667 1.72222H2.63333C1.8866 1.72222 1.51323 1.72222 1.22801 1.85544C0.977127 1.97261 0.773153 2.15959 0.645327 2.38957C0.5 2.65101 0.5 2.99327 0.5 3.67778V9.54444C0.5 10.2289 0.5 10.5712 0.645327 10.8327C0.773153 11.0626 0.977127 11.2496 1.22801 11.3668C1.51323 11.5 1.88659 11.5 2.63333 11.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mobile `icon-people.svg` style — people group */
function UsagePeopleIcon() {
  return (
    <svg className="h-3.5 w-4" viewBox="0 0 22 20" fill="none" aria-hidden>
      <path
        d="M16.2225 18.5435V16.7384C16.2225 15.7809 15.815 14.8626 15.0895 14.1856C14.3641 13.5085 13.3803 13.1282 12.3544 13.1282H4.61812C3.59223 13.1282 2.60836 13.5085 1.88295 14.1856C1.15753 14.8626 0.75 15.7809 0.75 16.7384V18.5435"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.48531 8.48649C10.6216 8.48649 12.3534 6.75467 12.3534 4.61837C12.3534 2.48206 10.6216 0.750244 8.48531 0.750244C6.34901 0.750244 4.61719 2.48206 4.61719 4.61837C4.61719 6.75467 6.34901 8.48649 8.48531 8.48649Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.9675 18.5435V16.6984C20.9669 15.8808 20.6626 15.0865 20.1025 14.4403C19.5424 13.7941 18.7582 13.3326 17.873 13.1282"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.0039 0.750244C14.8891 0.970154 15.6737 1.46967 16.234 2.17003C16.7943 2.87039 17.0984 3.73177 17.0984 4.61837C17.0984 5.50496 16.7943 6.36634 16.234 7.0667C15.6737 7.76707 14.8891 8.26658 14.0039 8.48649"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
