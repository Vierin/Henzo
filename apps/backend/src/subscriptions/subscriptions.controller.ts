import { Controller, Get, Headers } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { StripePricingService } from './stripe-pricing.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly authService: AuthService,
    private readonly stripePricing: StripePricingService,
  ) {}

  /**
   * Pro plan amounts in VND for mobile UI — from Stripe Price objects, cached server-side.
   */
  @Get('pro-prices')
  async getProPrices(@Headers('authorization') authHeader: string) {
    await this.authService.getCurrentUser(authHeader);
    const data = await this.stripePricing.getProPrices();
    return { success: true, data };
  }
}
