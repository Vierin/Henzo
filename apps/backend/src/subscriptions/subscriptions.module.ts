import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from './stripe.service';
import { PromotionCouponService } from './promotion-coupon.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, StripeService, PromotionCouponService],
  exports: [SubscriptionsService, StripeService, PromotionCouponService],
})
export class SubscriptionsModule {}
