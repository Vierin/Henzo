import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SubscriptionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlanLimitsService {
  static readonly SOLO_TRAINER_LIMIT = 1;
  static readonly SOLO_SESSIONS_PER_MONTH = 12;

  constructor(private readonly prisma: PrismaService) {}

  private async isSoloPlan(studioId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findUnique({
      where: { studioId },
      select: { type: true, status: true },
    });
    return !sub || sub.type === SubscriptionType.FREEMIUM;
  }

  /**
   * Throws 403 SOLO_TRAINER_LIMIT_EXCEEDED if the studio is on the Solo
   * (Freemium) plan and already has reached the trainer limit.
   */
  async assertTrainerLimit(studioId: string): Promise<void> {
    if (!(await this.isSoloPlan(studioId))) return;

    const count = await this.prisma.staff.count({
      where: { salonId: studioId },
    });

    if (count >= PlanLimitsService.SOLO_TRAINER_LIMIT) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          error: 'SOLO_TRAINER_LIMIT_EXCEEDED',
          message: `Solo plan is limited to ${PlanLimitsService.SOLO_TRAINER_LIMIT} trainer. Upgrade to Studio to add more.`,
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  /**
   * Throws 403 SOLO_SESSION_LIMIT_EXCEEDED if the studio is on the Solo
   * (Freemium) plan and has already reached the monthly session cap.
   */
  async assertMonthlySessionsLimit(studioId: string): Promise<void> {
    if (!(await this.isSoloPlan(studioId))) return;

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

    const count = await this.prisma.trainingSession.count({
      where: {
        studioId,
        startsAt: { gte: monthStart, lte: monthEnd },
        status: { not: 'CANCELLED' },
      },
    });

    if (count >= PlanLimitsService.SOLO_SESSIONS_PER_MONTH) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          error: 'SOLO_SESSION_LIMIT_EXCEEDED',
          message: `Solo plan allows ${PlanLimitsService.SOLO_SESSIONS_PER_MONTH} sessions per month. Upgrade to Studio for unlimited sessions.`,
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
