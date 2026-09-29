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
    if (interval === 'annual') {
      throw new BadRequestException('Annual billing is not available');
    }
    const key =
      plan === 'solo'
        ? 'STRIPE_SOLO_PRICE_MONTHLY_ID'
        : plan === 'enterprise'
          ? 'STRIPE_ENTERPRISE_PRICE_MONTHLY_ID'
          : 'STRIPE_STUDIO_PRICE_MONTHLY_ID';
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

  /** Raise the price now and drop a scheduled downgrade, if any. */
  async updateSubscriptionPrice(params: {
    stripeSubscriptionId: string;
    newPriceId: string;
    plan: CheckoutPlan;
    interval: CheckoutInterval;
  }): Promise<Stripe.Subscription> {
    const stripe = this.getStripe();
    let sub = await stripe.subscriptions.retrieve(params.stripeSubscriptionId);
    const scheduleId = scheduleIdOf(sub);
    if (scheduleId) {
      await stripe.subscriptionSchedules.release(scheduleId);
      sub = await stripe.subscriptions.retrieve(params.stripeSubscriptionId);
    }
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

  /**
   * Keep the paid price until `current_period_end`, then switch.
   * Does not change the live subscription price or plan metadata.
   */
  async scheduleSubscriptionPrice(params: {
    stripeSubscriptionId: string;
    newPriceId: string;
    plan: CheckoutPlan;
    interval: CheckoutInterval;
  }): Promise<Date> {
    const stripe = this.getStripe();
    const sub = await stripe.subscriptions.retrieve(
      params.stripeSubscriptionId,
    );
    const periodEnd = periodEndUnix(sub);
    const currentItem = sub.items.data[0];
    const currentPriceId =
      typeof currentItem?.price === 'string'
        ? currentItem.price
        : currentItem?.price?.id;
    if (!currentPriceId) {
      throw new BadRequestException('Stripe subscription has no price');
    }
    if (currentPriceId === params.newPriceId) {
      return new Date(periodEnd * 1000);
    }

    let scheduleId = scheduleIdOf(sub);
    if (!scheduleId) {
      const created = await stripe.subscriptionSchedules.create({
        from_subscription: params.stripeSubscriptionId,
      });
      scheduleId = created.id;
    }
    const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
    const nowSec = Math.floor(Date.now() / 1000);
    const currentPhase =
      schedule.phases.find(
        (phase) =>
          phase.start_date <= nowSec &&
          (phase.end_date == null || phase.end_date > nowSec),
      ) ?? schedule.phases[0];
    if (!currentPhase) {
      throw new BadRequestException('Stripe schedule has no current phase');
    }

    const phaseItems = currentPhase.items.map((item) => ({
      price: typeof item.price === 'string' ? item.price : item.price.id,
      quantity: item.quantity ?? 1,
    }));

    try {
      await stripe.subscriptionSchedules.update(scheduleId, {
        end_behavior: 'release',
        phases: [
          {
            items: phaseItems,
            start_date: currentPhase.start_date,
            end_date: periodEnd,
            proration_behavior: 'none',
            ...(currentPhase.metadata
              ? { metadata: currentPhase.metadata }
              : {}),
          },
          {
            items: [{ price: params.newPriceId, quantity: 1 }],
            proration_behavior: 'none',
            metadata: {
              ...(sub.metadata ?? {}),
              plan: params.plan,
              interval: params.interval,
            },
          },
        ],
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`subscriptionSchedules.update failed: ${msg}`);
      throw new BadRequestException(
        `Could not schedule the plan change: ${msg}`,
      );
    }

    return new Date(periodEnd * 1000);
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

function scheduleIdOf(sub: Stripe.Subscription): string | null {
  const schedule = sub.schedule;
  if (!schedule) return null;
  return typeof schedule === 'string' ? schedule : schedule.id;
}

function periodEndUnix(sub: Stripe.Subscription): number {
  const top = (sub as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  if (typeof top === 'number') return top;
  const item = sub.items.data[0] as
    | (Stripe.SubscriptionItem & { current_period_end?: number })
    | undefined;
  if (item && typeof item.current_period_end === 'number') {
    return item.current_period_end;
  }
  throw new BadRequestException(
    'Stripe subscription has no current period end',
  );
}
