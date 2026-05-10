import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { StripePricingService } from './stripe-pricing.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SubscriptionsController],
  providers: [StripePricingService],
  exports: [StripePricingService],
})
export class SubscriptionsModule {}
