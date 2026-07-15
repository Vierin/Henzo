import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SubscriptionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { planQuotaForType } from './plan-limits.constants';

export {
  SOLO_SESSIONS_PER_MONTH,
  SOLO_TRAINER_LIMIT,
  STUDIO_SESSIONS_PER_MONTH,
  STUDIO_TRAINER_LIMIT,
} from './plan-limits.constants';

@Injectable()
export class PlanLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  private async subscriptionTypeForStudio(
    studioId: string,
  ): Promise<SubscriptionType> {
    const sub = await this.prisma.subscription.findUnique({
      where: { studioId },
      select: { type: true, status: true },
    });
    if (!sub || sub.status !== 'ACTIVE') {
      return SubscriptionType.SOLO;
    }
    return sub.type;
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

  private monthWindow(): { monthStart: Date; monthEnd: Date } {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    return { monthStart, monthEnd };
  }

  /** Sessions created this month that count toward the plan cap. */
  private async monthlySessionsCount(studioId: string): Promise<number> {
    const { monthStart, monthEnd } = this.monthWindow();
    return this.prisma.trainingSession.count({
      where: {
        studioId,
        startsAt: { gte: monthStart, lte: monthEnd },
        status: { not: 'CANCELLED' },
      },
    });
  }

  /**
   * Current usage vs. plan caps for a studio, regardless of tier. Powers the
   * settings usage counter and the "12/12" limit dialog. A `null` limit means
   * the tier is uncapped (Enterprise).
   */
  async getStudioUsage(studioId: string): Promise<{
    tier: SubscriptionType;
    sessionsUsed: number;
    sessionsLimit: number | null;
    trainersUsed: number;
    trainersLimit: number | null;
  }> {
    const tier = await this.subscriptionTypeForStudio(studioId);
    const quota = planQuotaForType(tier);
    const [sessionsUsed, trainersUsed] = await Promise.all([
      this.monthlySessionsCount(studioId),
      this.prisma.trainer.count({ where: { studioId } }),
    ]);
    return {
      tier,
      sessionsUsed,
      sessionsLimit: quota ? quota.sessionsPerMonth : null,
      trainersUsed,
      trainersLimit: quota ? quota.trainerLimit : null,
    };
  }

  /**
   * Throws 403 if the studio reached its plan monthly session cap (Solo / Studio).
   */
  async assertMonthlySessionsLimit(studioId: string): Promise<void> {
    const tier = await this.subscriptionTypeForStudio(studioId);
    const quota = planQuotaForType(tier);
    if (!quota) return;

    const count = await this.monthlySessionsCount(studioId);

    if (count >= quota.sessionsPerMonth) {
      const isStudio = tier === SubscriptionType.STUDIO;
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          error: isStudio
            ? 'STUDIO_SESSION_LIMIT_EXCEEDED'
            : 'SOLO_SESSION_LIMIT_EXCEEDED',
          message: isStudio
            ? `Studio plan allows ${quota.sessionsPerMonth} sessions per month. Upgrade to Enterprise for unlimited sessions.`
            : `Solo plan allows ${quota.sessionsPerMonth} sessions per month. Upgrade to Studio for a higher limit.`,
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
