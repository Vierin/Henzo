import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export type CheckoutPlan = 'solo' | 'studio' | 'enterprise';
export type CheckoutInterval = 'monthly' | 'annual';

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

  getStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe is not configured (STRIPE_SECRET_KEY)',
      );
    }
    return this.stripe;
  }

  resolvePriceId(plan: CheckoutPlan, interval: CheckoutInterval): string {
    if (plan === 'solo' && interval === 'annual') {
      throw new BadRequestException('Solo is billed monthly only');
    }
    const key =
      plan === 'solo'
        ? 'STRIPE_SOLO_MONTHLY_PRICE_ID'
        : plan === 'enterprise'
          ? interval === 'annual'
            ? 'STRIPE_ENTERPRISE_YEARLY_PRICE_ID'
            : 'STRIPE_ENTERPRISE_MONTHLY_PRICE_ID'
          : interval === 'annual'
            ? 'STRIPE_YEARLY_PRICE_ID'
            : 'STRIPE_MONTHLY_PRICE_ID';
    const priceId = this.config.get<string>(key)?.trim();
    if (!priceId) {
      throw new BadRequestException(
        `Stripe price ID is not configured for ${plan}/${interval} (${key})`,
      );
    }
    return priceId;
  }

  async createSubscriptionCheckoutSession(params: {
    userId: string;
    email: string;
    plan: CheckoutPlan;
    interval: CheckoutInterval;
    successUrl: string;
    cancelUrl: string;
    stripeCustomerId?: string | null;
  }): Promise<string> {
    const stripe = this.getStripe();
    const priceId = this.resolvePriceId(params.plan, params.interval);

    const successUrl = params.successUrl.includes('{CHECKOUT_SESSION_ID}')
      ? params.successUrl
      : `${params.successUrl}${params.successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;

    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: params.cancelUrl,
        client_reference_id: params.userId,
        metadata: {
          userId: params.userId,
          plan: params.plan,
          interval: params.interval,
        },
        subscription_data: {
          metadata: {
            userId: params.userId,
            plan: params.plan,
            interval: params.interval,
          },
        },
      };

      if (params.stripeCustomerId?.trim()) {
        sessionParams.customer = params.stripeCustomerId.trim();
      } else {
        sessionParams.customer_email = params.email;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      if (!session.url) {
        throw new BadRequestException('Stripe did not return a checkout URL');
      }
      return session.url;
    } catch (e: unknown) {
      if (e instanceof BadRequestException) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`checkout.sessions.create failed: ${msg}`);
      throw new BadRequestException(`Could not start checkout: ${msg}`);
    }
  }

  async createBillingPortalSession(params: {
    stripeCustomerId: string;
    returnUrl: string;
  }): Promise<string> {
    const stripe = this.getStripe();
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: params.stripeCustomerId,
        return_url: params.returnUrl,
      });
      if (!session.url) {
        throw new BadRequestException('Stripe did not return a portal URL');
      }
      return session.url;
    } catch (e: unknown) {
      if (e instanceof BadRequestException) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`billingPortal.sessions.create failed: ${msg}`);
      throw new BadRequestException(`Could not open billing portal: ${msg}`);
    }
  }

  /** Switch price on an existing Stripe subscription (upgrade/downgrade). */
  async updateSubscriptionPrice(params: {
    stripeSubscriptionId: string;
    newPriceId: string;
    plan: CheckoutPlan;
    interval: CheckoutInterval;
  }): Promise<Stripe.Subscription> {
    const stripe = this.getStripe();
    const sub = await stripe.subscriptions.retrieve(
      params.stripeSubscriptionId,
    );
    const itemId = sub.items.data[0]?.id;
    if (!itemId) {
      throw new BadRequestException('Stripe subscription has no items');
    }
    return stripe.subscriptions.update(params.stripeSubscriptionId, {
      items: [{ id: itemId, price: params.newPriceId }],
      proration_behavior: 'create_prorations',
      metadata: {
        ...sub.metadata,
        plan: params.plan,
        interval: params.interval,
      },
    });
  }

  /** Used after Checkout redirect (web success URL with `session_id`). */
  async retrieveCheckoutSessionExpanded(sessionId: string) {
    const stripe = this.getStripe();
    return stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET')?.trim();
    if (!secret) {
      throw new ServiceUnavailableException(
        'Stripe webhook is not configured (STRIPE_WEBHOOK_SECRET)',
      );
    }
    const stripe = this.getStripe();
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
