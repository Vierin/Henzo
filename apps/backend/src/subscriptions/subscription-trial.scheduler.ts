import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  SubscriptionBillingProvider,
  SubscriptionStatus,
  SubscriptionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { trialEndingNotice } from './trial-notices';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SubscriptionTrialScheduler {
  private readonly logger = new Logger(SubscriptionTrialScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Daily: remind 30 days before an unpaid Studio trial ends, then expire it. */
  @Cron('0 8 * * *')
  async handleStudioTrials(): Promise<void> {
    const now = new Date();
    const remindBefore = new Date(now.getTime() + 30 * DAY_MS);

    const ending = await this.prisma.subscription.findMany({
      where: {
        billingProvider: SubscriptionBillingProvider.NONE,
        type: SubscriptionType.STUDIO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: { gt: now, lte: remindBefore },
      },
      select: {
        id: true,
        Studio: { select: { ownerId: true } },
      },
    });

    for (const row of ending) {
      const ownerId = row.Studio.ownerId;
      const already = await this.prisma.inAppNotification.findFirst({
        where: { userId: ownerId, type: 'studio_trial_ending' },
        select: { id: true },
      });
      if (already) continue;

      const tokens = await this.notifications.getPushTokensByUserId(ownerId);
      const language = tokens[0]?.language ?? 'en';
      const notice = trialEndingNotice(language);
      try {
        await this.notifications.createInAppNotification({
          userId: ownerId,
          type: 'studio_trial_ending',
          title: notice.title,
          body: notice.body,
          data: { type: 'studio_trial_ending' },
        });
        await this.notifications.sendPushNotification(
          tokens,
          notice.title,
          notice.body,
          { type: 'studio_trial_ending' },
        );
      } catch (e) {
        this.logger.warn(`Trial reminder failed for ${ownerId}: ${e}`);
      }
    }

    const expired = await this.prisma.subscription.updateMany({
      where: {
        billingProvider: SubscriptionBillingProvider.NONE,
        type: SubscriptionType.STUDIO,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: { lt: now },
      },
      data: {
        status: SubscriptionStatus.EXPIRED,
        updatedAt: now,
      },
    });

    if (ending.length > 0 || expired.count > 0) {
      this.logger.log(
        `Studio trials: reminded candidates=${ending.length}, expired=${expired.count}`,
      );
    }
  }
}
