import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SubscriptionType } from '@prisma/client';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { PrismaService } from '../prisma/prisma.service';
import { planQuotaForType } from './plan-limits.constants';
import { hasSubscriptionAccess } from './subscription-access.util';

export {
  SOLO_SESSIONS_PER_MONTH,
  SOLO_TRAINER_LIMIT,
  STUDIO_SESSIONS_PER_MONTH,
  STUDIO_TRAINER_LIMIT,
} from './plan-limits.constants';

const DEFAULT_STUDIO_TIMEZONE = 'Asia/Ho_Chi_Minh';

type MonthKey = string; // YYYY-MM in studio timezone

@Injectable()
export class PlanLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  private async subscriptionRow(studioId: string) {
    return this.prisma.subscription.findUnique({
      where: { studioId },
    });
  }

  private throwSubscriptionRequired(): never {
    throw new HttpException(
      {
        statusCode: HttpStatus.FORBIDDEN,
        error: 'SUBSCRIPTION_REQUIRED',
        message: 'Subscribe to add classes and trainers.',
      },
      HttpStatus.FORBIDDEN,
    );
  }

  private async subscriptionTypeForStudio(
    studioId: string,
  ): Promise<SubscriptionType> {
    const sub = await this.subscriptionRow(studioId);
    if (!sub || !hasSubscriptionAccess(sub)) {
      this.throwSubscriptionRequired();
    }
    return sub.type;
  }

  private async studioTimezone(studioId: string): Promise<string> {
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: { timezone: true },
    });
    return studio?.timezone?.trim() || DEFAULT_STUDIO_TIMEZONE;
  }

  /** Calendar month key (YYYY-MM) for a UTC instant in the studio timezone. */
  monthKeyForDate(date: Date, timezone: string): MonthKey {
    const zoned = toZonedTime(date, timezone);
    const y = zoned.getFullYear();
    const m = String(zoned.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  /** Inclusive UTC bounds for a studio-local calendar month. */
  private monthWindowUtc(
    year: number,
    monthIndex0: number,
    timezone: string,
  ): { monthStart: Date; monthEnd: Date } {
    const monthStart = fromZonedTime(
      new Date(year, monthIndex0, 1, 0, 0, 0, 0),
      timezone,
    );
    const nextMonthStart = fromZonedTime(
      new Date(year, monthIndex0 + 1, 1, 0, 0, 0, 0),
      timezone,
    );
    const monthEnd = new Date(nextMonthStart.getTime() - 1);
    return { monthStart, monthEnd };
  }

  private parseMonthKey(key: MonthKey): { year: number; monthIndex0: number } {
    const [ys, ms] = key.split('-');
    return { year: Number(ys), monthIndex0: Number(ms) - 1 };
  }

  /**
   * Throws 403 if the studio reached its plan trainer cap (Solo / Studio).
   */
  async assertTrainerLimit(studioId: string): Promise<void> {
    const tier = await this.subscriptionTypeForStudio(studioId);
    const quota = planQuotaForType(tier);
    if (!quota) return;

    const count = await this.prisma.trainer.count({
      where: { studioId },
    });

    if (count >= quota.trainerLimit) {
      const isStudio = tier === SubscriptionType.STUDIO;
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          error: isStudio
            ? 'STUDIO_TRAINER_LIMIT_EXCEEDED'
            : 'SOLO_TRAINER_LIMIT_EXCEEDED',
          message: isStudio
            ? `Studio plan is limited to ${quota.trainerLimit} trainers. Upgrade to Enterprise to add more.`
            : `Solo plan is limited to ${quota.trainerLimit} trainer. Upgrade to Studio to add more.`,
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  /** Non-cancelled sessions whose startsAt falls in the given studio-local month. */
  private async monthlySessionsCount(
    studioId: string,
    monthKey: MonthKey,
    timezone: string,
    excludeSessionIds: string[] = [],
  ): Promise<number> {
    const { year, monthIndex0 } = this.parseMonthKey(monthKey);
    const { monthStart, monthEnd } = this.monthWindowUtc(
      year,
      monthIndex0,
      timezone,
    );
    return this.prisma.trainingSession.count({
      where: {
        studioId,
        startsAt: { gte: monthStart, lte: monthEnd },
        status: { not: 'CANCELLED' },
        ...(excludeSessionIds.length > 0
          ? { id: { notIn: excludeSessionIds } }
          : {}),
      },
    });
  }

  private throwSessionLimit(
    tier: SubscriptionType,
    sessionsPerMonth: number,
  ): never {
    const isStudio = tier === SubscriptionType.STUDIO;
    throw new HttpException(
      {
        statusCode: HttpStatus.FORBIDDEN,
        error: isStudio
          ? 'STUDIO_SESSION_LIMIT_EXCEEDED'
          : 'SOLO_SESSION_LIMIT_EXCEEDED',
        message: isStudio
          ? `Studio plan allows ${sessionsPerMonth} sessions per month. Upgrade to Enterprise for unlimited sessions.`
          : `Solo plan allows ${sessionsPerMonth} sessions per month. Upgrade to Studio for a higher limit.`,
      },
      HttpStatus.FORBIDDEN,
    );
  }

  /**
   * Current usage vs. plan caps for a studio, regardless of tier. Powers the
   * settings usage counter and the limit dialog. A `null` limit means
   * the tier is uncapped (Enterprise).
   */
  async getStudioUsage(studioId: string): Promise<{
    tier: SubscriptionType;
    sessionsUsed: number;
    sessionsLimit: number | null;
    trainersUsed: number;
    trainersLimit: number | null;
    hasAccess: boolean;
  }> {
    const sub = await this.subscriptionRow(studioId);
    const allowed = hasSubscriptionAccess(sub);
    const tier = allowed && sub ? sub.type : SubscriptionType.SOLO;
    const quota = planQuotaForType(tier);
    const timezone = await this.studioTimezone(studioId);
    const nowKey = this.monthKeyForDate(new Date(), timezone);
    const [sessionsUsed, trainersUsed] = await Promise.all([
      this.monthlySessionsCount(studioId, nowKey, timezone),
      this.prisma.trainer.count({ where: { studioId } }),
    ]);
    return {
      tier,
      sessionsUsed,
      sessionsLimit: quota ? quota.sessionsPerMonth : null,
      trainersUsed,
      trainersLimit: quota ? quota.trainerLimit : null,
      hasAccess: allowed,
    };
  }

  /**
   * @deprecated Prefer assertCanCreateSessions / filterSessionsWithinQuota.
   * Kept for callers that only need "is current month already full?".
   */
  async assertMonthlySessionsLimit(studioId: string): Promise<void> {
    const timezone = await this.studioTimezone(studioId);
    const nowKey = this.monthKeyForDate(new Date(), timezone);
    await this.assertCanCreateSessions(studioId, [
      // Probe: one synthetic slot in the current studio-local month.
      // Real enforcement for creates must pass actual candidate startsAt.
      this.probeDateForMonthKey(nowKey, timezone),
    ]);
  }

  private probeDateForMonthKey(monthKey: MonthKey, timezone: string): Date {
    const { year, monthIndex0 } = this.parseMonthKey(monthKey);
    return fromZonedTime(new Date(year, monthIndex0, 1, 12, 0, 0, 0), timezone);
  }

  /**
   * Hard-check that adding `proposedStartsAt` (and optionally removing
   * `creditStartsAt` first) keeps every studio-local month within quota.
   */
  async assertCanCreateSessions(
    studioId: string,
    proposedStartsAt: Date[],
    opts?: {
      creditStartsAt?: Date[];
      excludeSessionIds?: string[];
    },
  ): Promise<void> {
    if (proposedStartsAt.length === 0) return;

    const tier = await this.subscriptionTypeForStudio(studioId);
    const quota = planQuotaForType(tier);
    if (!quota) return;

    const timezone = await this.studioTimezone(studioId);
    const excludeSessionIds = opts?.excludeSessionIds ?? [];

    const creditByMonth = new Map<MonthKey, number>();
    for (const d of opts?.creditStartsAt ?? []) {
      const key = this.monthKeyForDate(d, timezone);
      creditByMonth.set(key, (creditByMonth.get(key) ?? 0) + 1);
    }

    const proposedByMonth = new Map<MonthKey, number>();
    for (const d of proposedStartsAt) {
      const key = this.monthKeyForDate(d, timezone);
      proposedByMonth.set(key, (proposedByMonth.get(key) ?? 0) + 1);
    }

    for (const [monthKey, proposed] of proposedByMonth) {
      const existing = await this.monthlySessionsCount(
        studioId,
        monthKey,
        timezone,
        excludeSessionIds,
      );
      const credit = creditByMonth.get(monthKey) ?? 0;
      const after = existing - credit + proposed;
      if (after > quota.sessionsPerMonth) {
        this.throwSessionLimit(tier, quota.sessionsPerMonth);
      }
    }
  }

  /**
   * Keep only candidates that fit remaining monthly capacity (studio TZ).
   * Earlier startsAt win. Does not throw — empty result means nothing fits.
   */
  async filterSessionsWithinQuota<T extends { startsAt: Date }>(
    studioId: string,
    candidates: T[],
  ): Promise<{ accepted: T[]; skippedDueToLimit: number }> {
    if (candidates.length === 0) {
      return { accepted: [], skippedDueToLimit: 0 };
    }

    const tier = await this.subscriptionTypeForStudio(studioId);
    const quota = planQuotaForType(tier);
    if (!quota) {
      return { accepted: candidates, skippedDueToLimit: 0 };
    }

    const timezone = await this.studioTimezone(studioId);
    const usedByMonth = new Map<MonthKey, number>();
    const accepted: T[] = [];
    let skippedDueToLimit = 0;

    const sorted = [...candidates].sort(
      (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
    );

    for (const candidate of sorted) {
      const key = this.monthKeyForDate(candidate.startsAt, timezone);
      let used = usedByMonth.get(key);
      if (used === undefined) {
        used = await this.monthlySessionsCount(studioId, key, timezone);
        usedByMonth.set(key, used);
      }
      if (used >= quota.sessionsPerMonth) {
        skippedDueToLimit += 1;
        continue;
      }
      accepted.push(candidate);
      usedByMonth.set(key, used + 1);
    }

    return { accepted, skippedDueToLimit };
  }
}
