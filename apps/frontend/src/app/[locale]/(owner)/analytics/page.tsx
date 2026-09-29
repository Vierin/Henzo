'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, UserMinus, UserPlus, Users } from 'lucide-react';
import { extractLocaleFromPath, withLocale, type Locale } from '@/i18n/routing';
import { useTranslation } from '@/contexts/LanguageContext';
import { useOwnerStudio } from '@/contexts/OwnerStudioContext';
import { ownerTheme } from '@/lib/owner/owner-theme';
import { formatMoney, parseStudioCurrency } from '@/lib/format-money';
import {
  analyticsRange,
  fetchStudioAnalytics,
  isoLocalDayEnd,
  isoLocalDayStart,
  type StudioAnalytics,
} from '@/lib/owner/fetch-analytics';

const PERIODS = [7, 30, 90] as const;
const TREND_BUCKETS = 7;

type TrendPoint = { date: Date; value: number };

function deltaPercent(current: number, previous: number | undefined): string {
  if (previous == null || previous <= 0) return '';
  const delta = ((current - previous) / previous) * 100;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${Math.round(delta)}%`;
}

function studioAgeDays(createdAt: string | undefined): number | null {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return null;
  const now = new Date();
  const createdDay = new Date(
    created.getFullYear(),
    created.getMonth(),
    created.getDate(),
  );
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - createdDay.getTime()) / 86400000) + 1;
}

function MetricIcon({
  children,
  background,
  color,
}: {
  children: ReactNode;
  background: string;
  color: string;
}) {
  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: background, color }}
    >
      {children}
    </span>
  );
}

function OccupancyRing({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(1, percent));
  const r = 26;
  const c = 2 * Math.PI * r;
  const dash = c * clamped;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke={ownerTheme.borderSoft}
        strokeWidth="7"
      />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke={ownerTheme.accent}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform="rotate(-90 36 36)"
      />
      <text
        x="36"
        y="40"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill={ownerTheme.text}
      >
        {Math.round(clamped * 100)}%
      </text>
    </svg>
  );
}

function RevenueTrend({
  title,
  points,
  locale,
}: {
  title: string;
  points: TrendPoint[];
  locale: string;
}) {
  const w = 640;
  const h = 168;
  const padX = 12;
  const padY = 16;
  const max = Math.max(...points.map((p) => p.value), 1);
  const coords = points.map((p, i) => {
    const x =
      padX +
      (points.length === 1
        ? (w - padX * 2) / 2
        : (i * (w - padX * 2)) / (points.length - 1));
    const y = h - padY - (p.value / max) * (h - padY * 2);
    return { x, y };
  });
  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');
  const area =
    coords.length > 0
      ? `${line} L${coords[coords.length - 1]!.x.toFixed(1)},${h - padY} L${coords[0]!.x.toFixed(1)},${h - padY} Z`
      : '';

  return (
    <section
      className="rounded-2xl border p-4 sm:p-5"
      style={{
        backgroundColor: ownerTheme.card,
        borderColor: ownerTheme.borderSoft,
      }}
    >
      <h2 className="text-sm font-semibold" style={{ color: ownerTheme.text }}>
        {title}
      </h2>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-3 h-40 w-full"
        role="img"
        aria-label={title}
      >
        <path d={area} fill="rgba(241, 89, 66, 0.12)" />
        <path
          d={line}
          fill="none"
          stroke={ownerTheme.accent}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="4" fill={ownerTheme.accent} />
        ))}
      </svg>
      <div
        className="mt-1 grid grid-cols-7 gap-1 text-center text-[11px]"
        style={{ color: ownerTheme.textSecondary }}
      >
        {points.map((p) => (
          <span key={p.date.toISOString()}>
            {p.date.toLocaleDateString(locale, {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function OwnerAnalyticsPage() {
  const t = useTranslation();
  const pathname = usePathname();
  const locale = (extractLocaleFromPath(pathname) ?? 'en') as Locale;
  const { studio } = useOwnerStudio();
  const currency = parseStudioCurrency(studio?.currency);
  const [days, setDays] = useState<number>(30);
  const [current, setCurrent] = useState<StudioAnalytics | null>(null);
  const [previous, setPrevious] = useState<StudioAnalytics | null>(null);
  const [trend, setTrend] = useState<TrendPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const age = studioAgeDays(studio?.createdAt);
  const disabledDays = useMemo(() => {
    if (age == null) return new Set<number>();
    return new Set(PERIODS.filter((d) => d > 7 && age < d));
  }, [age]);

  useEffect(() => {
    if (disabledDays.has(days)) setDays(7);
  }, [disabledDays, days]);

  const generationRef = useRef(0);

  const loadTrend = useCallback(
    async (start: Date, end: Date, generation: number) => {
      const totalMs = end.getTime() - start.getTime();
      if (generationRef.current !== generation) return;
      if (totalMs <= 0) {
        setTrend([]);
        setTrendLoading(false);
        return;
      }
      const bucketMs = Math.floor(totalMs / TREND_BUCKETS);
      setTrendLoading(true);
      try {
        const points = await Promise.all(
          Array.from({ length: TREND_BUCKETS }, async (_, i) => {
            const bucketStart = new Date(start.getTime() + bucketMs * i);
            const bucketEnd =
              i === TREND_BUCKETS - 1
                ? end
                : new Date(start.getTime() + bucketMs * (i + 1) - 1);
            const data = await fetchStudioAnalytics(
              bucketStart.toISOString(),
              bucketEnd.toISOString(),
            );
            return { date: bucketStart, value: data?.revenueTotal ?? 0 };
          }),
        );
        if (generationRef.current !== generation) return;
        setTrend(points);
      } catch {
        if (generationRef.current !== generation) return;
        setTrend([]);
      } finally {
        if (generationRef.current === generation) setTrendLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const generation = ++generationRef.current;
    const { start, end } = analyticsRange(days);
    const previousEnd = new Date(start);
    previousEnd.setDate(previousEnd.getDate() - 1);
    const previousStart = new Date(
      previousEnd.getFullYear(),
      previousEnd.getMonth(),
      previousEnd.getDate(),
    );
    previousStart.setDate(previousStart.getDate() - (days - 1));

    let cancelled = false;
    setLoading(true);
    setError(null);
    setTrend(null);

    void (async () => {
      try {
        const [cur, prev] = await Promise.all([
          fetchStudioAnalytics(isoLocalDayStart(start), isoLocalDayEnd(end)),
          fetchStudioAnalytics(
            isoLocalDayStart(previousStart),
            isoLocalDayEnd(previousEnd),
          ),
        ]);
        if (cancelled) return;
        if (!cur) {
          setCurrent(null);
          setPrevious(null);
          setError('empty');
          setLoading(false);
          return;
        }
        setCurrent(cur);
        setPrevious(prev);
        setLoading(false);
        if (cur.isPro) {
          void loadTrend(start, end, generation);
        }
      } catch {
        if (cancelled) return;
        setCurrent(null);
        setError('failed');
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [days, reloadKey, loadTrend]);

  const currencyMark = useMemo(() => {
    try {
      return (
        new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          currencyDisplay: 'narrowSymbol',
        })
          .formatToParts(0)
          .find((part) => part.type === 'currency')?.value ?? currency
      );
    } catch {
      return currency;
    }
  }, [currency, locale]);

  const periodLabel = (value: number) =>
    value === 7
      ? t('owner.dashboard.analytics.last7Days')
      : value === 30
        ? t('owner.dashboard.analytics.last30Days')
        : t('owner.dashboard.analytics.last90Days');

  const revenueDelta = current
    ? deltaPercent(current.revenueTotal, previous?.revenueTotal)
    : '';
  const clientsDelta = current
    ? deltaPercent(current.clientsTotal, previous?.clientsTotal)
    : '';
  const waitlistDelta = current
    ? deltaPercent(current.enrollmentsActive, previous?.enrollmentsActive)
    : '';
  const noShowShare =
    current && current.bookingCount > 0
      ? t('owner.dashboard.analytics.ofBookings').replace(
          '{pct}',
          String(
            Math.round((current.noshowCount / current.bookingCount) * 100),
          ),
        )
      : '';

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1
        className="text-center text-xl font-semibold sm:text-2xl"
        style={{ color: ownerTheme.text }}
      >
        {t('owner.dashboard.analytics.title')}
      </h1>

      <div className="mt-4 flex justify-center gap-2">
        {PERIODS.map((value) => {
          const disabled = disabledDays.has(value);
          const selected = days === value;
          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              title={
                disabled
                  ? t('owner.dashboard.analytics.notEnoughDataYet')
                  : undefined
              }
              onClick={() => {
                if (disabled || value === days) return;
                setDays(value);
              }}
              className="rounded-full px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                backgroundColor: selected ? ownerTheme.accent : ownerTheme.card,
                color: selected ? '#FFFFFF' : ownerTheme.text,
                border: `1px solid ${selected ? ownerTheme.accent : ownerTheme.borderSoft}`,
              }}
            >
              {periodLabel(value)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          <div
            className="h-24 animate-pulse rounded-2xl"
            style={{ backgroundColor: ownerTheme.bgSoft }}
          />
          <div className="grid grid-cols-2 gap-3">
            <div
              className="h-28 animate-pulse rounded-2xl"
              style={{ backgroundColor: ownerTheme.bgSoft }}
            />
            <div
              className="h-28 animate-pulse rounded-2xl"
              style={{ backgroundColor: ownerTheme.bgSoft }}
            />
          </div>
        </div>
      ) : error || !current ? (
        <div
          className="mt-4 rounded-2xl border p-4"
          style={{
            backgroundColor: ownerTheme.card,
            borderColor: ownerTheme.borderSoft,
          }}
        >
          <p className="text-sm" style={{ color: ownerTheme.text }}>
            {error === 'failed'
              ? t('owner.dashboard.analytics.failedLoad')
              : t('owner.dashboard.analytics.noData')}
          </p>
          <button
            type="button"
            className="mt-3 rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: ownerTheme.accent }}
            onClick={() => setReloadKey((n) => n + 1)}
          >
            {t('owner.dashboard.analytics.retry')}
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <article
            className="rounded-2xl border p-4"
            style={{
              backgroundColor: ownerTheme.card,
              borderColor: ownerTheme.borderSoft,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className="text-sm"
                  style={{ color: ownerTheme.textSecondary }}
                >
                  {t('owner.dashboard.analytics.revenue')}
                </p>
                <p
                  className="mt-1 text-2xl font-semibold"
                  style={{ color: ownerTheme.text }}
                >
                  {formatMoney(current.revenueTotal, currency)}
                </p>
                {current.isPro && revenueDelta ? (
                  <p
                    className="mt-1 text-xs font-medium"
                    style={{ color: '#16A34A' }}
                  >
                    {revenueDelta}{' '}
                    {t('owner.dashboard.analytics.fromPreviousDays').replace(
                      '{days}',
                      String(days),
                    )}
                  </p>
                ) : null}
              </div>
              <MetricIcon background="#DCFCE7" color="#16A34A">
                <TrendingUp className="h-5 w-5" />
              </MetricIcon>
            </div>
          </article>

          {!current.isPro ? (
            <article
              className="rounded-2xl border p-4"
              style={{
                backgroundColor: ownerTheme.card,
                borderColor: ownerTheme.borderSoft,
              }}
            >
              <h2
                className="text-base font-semibold"
                style={{ color: ownerTheme.text }}
              >
                {t('owner.dashboard.analytics.proLockedTitle')}
              </h2>
              <p
                className="mt-2 text-sm"
                style={{ color: ownerTheme.textSecondary }}
              >
                {t('owner.dashboard.analytics.proLockedDescription')}
              </p>
              <Link
                href={withLocale('/salon-info/subscription', locale)}
                className="mt-3 inline-flex rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: ownerTheme.accent }}
              >
                {t('owner.dashboard.analytics.upgrade')}
              </Link>
            </article>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <article
                  className="rounded-2xl border p-4"
                  style={{
                    backgroundColor: ownerTheme.card,
                    borderColor: ownerTheme.borderSoft,
                  }}
                >
                  <MetricIcon background="#DCFCE7" color="#16A34A">
                    <Users className="h-5 w-5" />
                  </MetricIcon>
                  <p
                    className="mt-3 text-sm"
                    style={{ color: ownerTheme.textSecondary }}
                  >
                    {t('owner.dashboard.analytics.activeClients')}
                  </p>
                  <p
                    className="mt-1 text-xl font-semibold"
                    style={{ color: ownerTheme.text }}
                  >
                    {current.clientsTotal}
                  </p>
                  {clientsDelta ? (
                    <p
                      className="mt-1 text-xs font-medium"
                      style={{ color: '#16A34A' }}
                    >
                      {clientsDelta}
                    </p>
                  ) : null}
                </article>
                <article
                  className="flex flex-col items-start rounded-2xl border p-4"
                  style={{
                    backgroundColor: ownerTheme.card,
                    borderColor: ownerTheme.borderSoft,
                  }}
                >
                  <p
                    className="text-sm"
                    style={{ color: ownerTheme.textSecondary }}
                  >
                    {t('owner.dashboard.analytics.avgOccupancy')}
                  </p>
                  <div className="mt-2">
                    <OccupancyRing percent={current.averageUtilization} />
                  </div>
                </article>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <article
                  className="rounded-2xl border p-4"
                  style={{
                    backgroundColor: ownerTheme.card,
                    borderColor: ownerTheme.borderSoft,
                  }}
                >
                  <MetricIcon background="#FEE2E2" color="#EF4444">
                    <UserMinus className="h-5 w-5" />
                  </MetricIcon>
                  <p
                    className="mt-3 text-sm"
                    style={{ color: ownerTheme.textSecondary }}
                  >
                    {t('owner.dashboard.analytics.noShow')}
                  </p>
                  <p
                    className="mt-1 text-xl font-semibold"
                    style={{ color: ownerTheme.text }}
                  >
                    {current.noshowCount}
                  </p>
                  {noShowShare ? (
                    <p
                      className="mt-1 text-xs"
                      style={{ color: ownerTheme.textSecondary }}
                    >
                      {noShowShare}
                    </p>
                  ) : null}
                </article>
                <article
                  className="rounded-2xl border p-4"
                  style={{
                    backgroundColor: ownerTheme.card,
                    borderColor: ownerTheme.borderSoft,
                  }}
                >
                  <MetricIcon background="#EDE9FE" color="#7C3AED">
                    <UserPlus className="h-5 w-5" />
                  </MetricIcon>
                  <p
                    className="mt-3 text-sm"
                    style={{ color: ownerTheme.textSecondary }}
                  >
                    {t('owner.dashboard.analytics.waitlistRequests')}
                  </p>
                  <p
                    className="mt-1 text-xl font-semibold"
                    style={{ color: ownerTheme.text }}
                  >
                    {current.enrollmentsActive}
                  </p>
                  {waitlistDelta ? (
                    <p
                      className="mt-1 text-xs font-medium"
                      style={{ color: '#7C3AED' }}
                    >
                      {waitlistDelta}
                    </p>
                  ) : null}
                </article>
              </div>

              {trendLoading || !trend ? (
                <div
                  className="h-52 animate-pulse rounded-2xl"
                  style={{ backgroundColor: ownerTheme.bgSoft }}
                />
              ) : (
                <RevenueTrend
                  title={t('owner.dashboard.analytics.revenueTrend').replace(
                    '{currency}',
                    currencyMark,
                  )}
                  points={trend}
                  locale={locale}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
