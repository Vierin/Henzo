import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { StripePricingService } from './stripe-pricing.service';
import { StripeCheckoutService } from './stripe-checkout.service';
import { SubscriptionsService } from './subscriptions.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [SubscriptionsController],
  providers: [StripePricingService, StripeCheckoutService, SubscriptionsService],
  exports: [StripePricingService, StripeCheckoutService, SubscriptionsService],
})
export class SubscriptionsModule {}
