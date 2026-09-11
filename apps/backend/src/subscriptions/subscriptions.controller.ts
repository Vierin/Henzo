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
import { SubscriptionsService } from './subscriptions.service';
import {
  CreateBillingPortalDto,
  CreateCheckoutSessionDto,
} from './dto/create-checkout-session.dto';
import { SyncCheckoutSessionDto } from './dto/sync-checkout-session.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly authService: AuthService,
    private readonly stripePricing: StripePricingService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  /**
   * After RevenueCat purchase / restore — pull entitlements and persist Pro in DB.
   */
  @Post('sync-revenuecat')
  async syncRevenueCat(@Headers('authorization') authHeader: string) {
    const { user } = await this.authService.getCurrentUser(authHeader);
    if (user.role !== 'OWNER') {
      throw new ForbiddenException('Only studio owners can sync subscriptions');
    }
    const data = await this.subscriptions.syncRevenueCat(user.id);
    return { success: true, data };
  }

  /**
   * Stripe Checkout (subscription) — web only; mobile uses RevenueCat IAP.
   * Supports Studio + Enterprise × monthly/annual.
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
    const url = await this.subscriptions.createCheckoutSessionForOwner(
      user.id,
      user.email,
      {
        plan: body.plan,
        interval: body.interval,
        successUrl: body.successUrl,
        cancelUrl: body.cancelUrl,
      },
    );
    return { url };
  }

  /**
   * Stripe Customer Portal — manage/cancel Stripe-billed subscriptions.
   */
  @Post('billing-portal')
  async createBillingPortal(
    @Headers('authorization') authHeader: string,
    @Body() body: CreateBillingPortalDto,
  ) {
    const { user } = await this.authService.getCurrentUser(authHeader);
    if (user.role !== 'OWNER') {
      throw new ForbiddenException('Only studio owners can manage billing');
    }
    const url = await this.subscriptions.createBillingPortalForOwner(
      user.id,
      body.returnUrl,
    );
    return { url };
  }

  /**
   * Current studio subscription for the authenticated owner.
   */
  @Get('current')
  async getCurrent(@Headers('authorization') authHeader: string) {
    const { user } = await this.authService.getCurrentUser(authHeader);
    if (user.role !== 'OWNER') {
      throw new ForbiddenException(
        'Only studio owners have subscriptions here',
      );
    }
    const data = await this.subscriptions.getCurrentForOwner(user.id);
    return { success: true, data };
  }

  /**
   * Current plan usage (monthly sessions, trainers) vs. caps.
   */
  @Get('usage')
  async getUsage(@Headers('authorization') authHeader: string) {
    const { user } = await this.authService.getCurrentUser(authHeader);
    if (user.role !== 'OWNER') {
      throw new ForbiddenException(
        'Only studio owners have subscriptions here',
      );
    }
    const data = await this.subscriptions.getUsageForOwner(user.id);
    return { success: true, data };
  }

  /**
   * After Stripe Checkout redirect: pull session + subscription and persist.
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
   * Pro plan amounts in EUR — Studio + Enterprise from Stripe Price objects.
   */
  @Get('pro-prices')
  async getProPrices(@Headers('authorization') authHeader: string) {
    await this.authService.getCurrentUser(authHeader);
    const data = await this.stripePricing.getProPrices();
    return { success: true, data };
  }
}
