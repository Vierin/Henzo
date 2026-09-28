import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { RevenueCatWebhookController } from './revenuecat-webhook.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripePricingService } from './stripe-pricing.service';
import { StripeCheckoutService } from './stripe-checkout.service';
import { RevenueCatService } from './revenuecat.service';
import { SubscriptionsService } from './subscriptions.service';
import { PlanLimitsService } from './plan-limits.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminEventLogModule } from '../admin/admin-event-log.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionTrialScheduler } from './subscription-trial.scheduler';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    AdminEventLogModule,
    NotificationsModule,
    ScheduleModule,
  ],
  controllers: [
    SubscriptionsController,
    RevenueCatWebhookController,
    StripeWebhookController,
  ],
  providers: [
    StripePricingService,
    StripeCheckoutService,
    RevenueCatService,
    SubscriptionsService,
    PlanLimitsService,
    SubscriptionTrialScheduler,
  ],
  exports: [
    StripePricingService,
    StripeCheckoutService,
    RevenueCatService,
    SubscriptionsService,
    PlanLimitsService,
  ],
})
export class SubscriptionsModule {}
