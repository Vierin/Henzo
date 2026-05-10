import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeCheckoutService {
  private readonly logger = new Logger(StripeCheckoutService.name);
  private stripe: Stripe | null = null;

  constructor(private readonly config: ConfigService) {
    const sk = this.config.get<string>('STRIPE_SECRET_KEY');
    if (sk) {
      this.stripe = new Stripe(sk);
    }
  }

  async createSubscriptionCheckoutSession(params: {
    userId: string;
    email: string;
    interval: 'monthly' | 'annual';
  }): Promise<string> {
    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe is not configured (STRIPE_SECRET_KEY)',
      );
    }
    const monthlyId = this.config.get<string>('STRIPE_MONTHLY_PRICE_ID');
    const yearlyId = this.config.get<string>('STRIPE_YEARLY_PRICE_ID');
    const priceId =
      params.interval === 'annual' ? yearlyId : monthlyId;
    if (!priceId?.trim()) {
      throw new BadRequestException(
        `Stripe price ID is not configured for interval "${params.interval}" (${params.interval === 'annual' ? 'STRIPE_YEARLY_PRICE_ID' : 'STRIPE_MONTHLY_PRICE_ID'})`,
      );
    }

    const scheme = (
      this.config.get<string>('MOBILE_DEEP_LINK_SCHEME') || 'henzo'
    ).trim();
    const successUrl =
      this.config.get<string>('STRIPE_CHECKOUT_SUCCESS_URL') ||
      `${scheme}://subscription-checkout?status=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl =
      this.config.get<string>('STRIPE_CHECKOUT_CANCEL_URL') ||
      `${scheme}://subscription-checkout?status=cancelled`;

    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: params.email,
        client_reference_id: params.userId,
        metadata: {
          userId: params.userId,
          interval: params.interval,
        },
        subscription_data: {
          metadata: {
            userId: params.userId,
            interval: params.interval,
          },
        },
      });

      if (!session.url) {
        throw new BadRequestException('Stripe did not return a checkout URL');
      }
      return session.url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`checkout.sessions.create failed: ${msg}`);
      throw new BadRequestException(
        `Could not start checkout: ${msg}`,
      );
    }
  }

  /** Used after mobile returns from Checkout (deep link with `session_id`). */
  async retrieveCheckoutSessionExpanded(sessionId: string) {
    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe is not configured (STRIPE_SECRET_KEY)',
      );
    }
    return this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });
  }
}
