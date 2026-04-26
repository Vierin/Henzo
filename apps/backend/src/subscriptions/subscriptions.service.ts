import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Subscription } from '@prisma/client';

/** Exposed to API clients (e.g. owner UI) to show paywall / disable config actions. */
export const SUBSCRIPTION_CONFIG_LOCKED_ERROR =
  'TRIAL_EXPIRED_CONFIG_LOCKED' as const;

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async getCurrentSubscription(userId: string) {
    try {
      // Find user's salon/studio depending on active Prisma schema
      const salonRepo = this.prisma.salon ?? this.prisma.studio;
      const salon = await salonRepo.findFirst({
        where: {
          ownerId: userId,
        },
        select: {
          id: true,
        },
      });

      if (!salon) {
        throw new HttpException('Salon not found', HttpStatus.NOT_FOUND);
      }

      const subscription = await this.prisma.subscription.findUnique({
        where: {
          studioId: salon.id,
        },
      });

      if (!subscription) {
        const now = new Date();
        const trialEndDate = new Date(now);
        trialEndDate.setMonth(trialEndDate.getMonth() + 3);
        const oneMonthFromTrialEnd = new Date(trialEndDate);
        oneMonthFromTrialEnd.setMonth(oneMonthFromTrialEnd.getMonth() + 1);

        const newSubscription = await this.prisma.subscription.create({
          data: {
            studioId: salon.id,
            type: 'FREEMIUM',
            status: 'ACTIVE',
            startDate: now,
            endDate: oneMonthFromTrialEnd,
            nextPaymentDate: oneMonthFromTrialEnd,
            trialEndDate: trialEndDate,
            amount: 0,
            updatedAt: now,
          },
        });

        return newSubscription;
      }
      return subscription;
    } catch (error) {
      console.error('❌ Error getting subscription:', error);
      throw error;
    }
  }

  /**
   * When false, owner may not add services, staff, or time blocks (soft limit after trial without payment).
   * Paid salons: allowed until endDate (inclusive of active period, including cancel_at_period_end).
   * Trial: allowed while trialEndDate is in the future.
   */
  isSalonConfigurationExpansionAllowed(
    sub: Pick<Subscription, 'amount' | 'status' | 'trialEndDate' | 'endDate'>,
  ): boolean {
    const now = new Date();
    const amount = sub.amount ?? 0;

    if (amount > 0) {
      if (sub.endDate && new Date(sub.endDate) < now) {
        return false;
      }
      return true;
    }

    if (sub.trialEndDate && new Date(sub.trialEndDate) > now) {
      return true;
    }

    return false;
  }

  async assertSalonConfigurationExpansionAllowed(
    userId: string,
  ): Promise<void> {
    const sub = await this.getCurrentSubscription(userId);
    if (this.isSalonConfigurationExpansionAllowed(sub)) {
      return;
    }
    throw new HttpException(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        message:
          'Subscription required to add services, staff, or calendar blocks. Your trial has ended — upgrade to continue.',
        code: SUBSCRIPTION_CONFIG_LOCKED_ERROR,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  /** Verify salon belongs to owner, then apply subscription expansion rules. */
  async assertSalonOwnerMayExpandConfiguration(
    userId: string,
    salonId: string,
  ): Promise<void> {
    const salon = await this.prisma.salon.findFirst({
      where: { id: salonId, ownerId: userId },
      select: { id: true },
    });
    if (!salon) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    await this.assertSalonConfigurationExpansionAllowed(userId);
  }

  async cancelSubscription(userId: string): Promise<{ cancelled: boolean }> {
    const salon = await this.prisma.salon.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!salon) {
      throw new HttpException('Salon not found', HttpStatus.NOT_FOUND);
    }
    const subscription = await this.prisma.subscription.findUnique({
      where: { studioId: salon.id },
    });
    if (!subscription) {
      throw new HttpException('Subscription not found', HttpStatus.NOT_FOUND);
    }

    const cancelDate =
      subscription.endDate ?? subscription.nextPaymentDate ?? new Date();
    await this.prisma.subscription.update({
      where: { studioId: salon.id },
      data: {
        status: 'CANCELLED',
        endDate: cancelDate,
        updatedAt: new Date(),
      },
    });

    return { cancelled: true };
  }

  async switchSubscription(userId: string, planType: 'FREEMIUM' | 'PRO') {
    try {
      // Find user's salon
      const salon = await this.prisma.salon.findFirst({
        where: {
          ownerId: userId,
        },
        select: {
          id: true,
        },
      });

      if (!salon) {
        throw new HttpException('Salon not found', HttpStatus.NOT_FOUND);
      }

      // Get current subscription
      const currentSubscription = await this.prisma.subscription.findUnique({
        where: {
          studioId: salon.id,
        },
      });

      if (!currentSubscription) {
        throw new HttpException('Subscription not found', HttpStatus.NOT_FOUND);
      }

      const now = new Date();
      const oneMonthFromNow = new Date(now);
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

      const updatedSubscription = await this.prisma.subscription.update({
        where: {
          studioId: salon.id,
        },
        data: {
          type: planType,
          status: 'ACTIVE',
          startDate: now,
          endDate: oneMonthFromNow,
          nextPaymentDate: oneMonthFromNow,
          amount: planType === 'PRO' ? 390000 : 0,
          updatedAt: now,
        },
      });

      return updatedSubscription;
    } catch (error) {
      console.error('❌ Error switching subscription:', error);
      throw error;
    }
  }

}
