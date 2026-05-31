import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { RevenueCatWebhookController } from './revenuecat-webhook.controller';
import { StripePricingService } from './stripe-pricing.service';
import { StripeCheckoutService } from './stripe-checkout.service';
import { RevenueCatService } from './revenuecat.service';
import { SubscriptionsService } from './subscriptions.service';
import { PlanLimitsService } from './plan-limits.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AuthModule, PrismaModule, AdminModule],
  controllers: [SubscriptionsController, RevenueCatWebhookController],
  providers: [
    StripePricingService,
    StripeCheckoutService,
    RevenueCatService,
    SubscriptionsService,
    PlanLimitsService,
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
