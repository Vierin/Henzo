import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { StripePricingService } from './stripe-pricing.service';
import { StripeCheckoutService } from './stripe-checkout.service';
import { SubscriptionsService } from './subscriptions.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { SyncCheckoutSessionDto } from './dto/sync-checkout-session.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly authService: AuthService,
    private readonly stripePricing: StripePricingService,
    private readonly checkout: StripeCheckoutService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  /**
   * Stripe Checkout (subscription) — редирект на оплату Pro (mobile / web).
   */
  @Post('create-checkout-session')
  async createCheckoutSession(
    @Headers('authorization') authHeader: string,
    @Body() body: CreateCheckoutSessionDto,
  ) {
    const { user } = await this.authService.getCurrentUser(authHeader);
    if (user.role !== 'OWNER') {
      throw new ForbiddenException('Only studio owners can subscribe');
    }
    const url = await this.checkout.createSubscriptionCheckoutSession({
      userId: user.id,
      email: user.email,
      interval: body.interval,
    });
    return { url };
  }

  /**
   * Current studio subscription for the authenticated owner (mobile dashboard / subscription screen).
   */
  @Get('current')
  async getCurrent(@Headers('authorization') authHeader: string) {
    const { user } = await this.authService.getCurrentUser(authHeader);
    if (user.role !== 'OWNER') {
      throw new ForbiddenException('Only studio owners have subscriptions here');
    }
    const data = await this.subscriptions.getCurrentForOwner(user.id);
    return { success: true, data };
  }

  /**
   * After Stripe Checkout redirect: pull session + subscription from Stripe and persist Pro in DB.
   */
  @Post('sync-checkout-session')
  async syncCheckoutSession(
    @Headers('authorization') authHeader: string,
    @Body() body: SyncCheckoutSessionDto,
  ) {
    const { user } = await this.authService.getCurrentUser(authHeader);
    if (user.role !== 'OWNER') {
      throw new ForbiddenException('Only studio owners can sync subscriptions');
    }
    const data = await this.subscriptions.syncCheckoutSession(
      user.id,
      body.sessionId.trim(),
    );
    return { success: true, data };
  }

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
