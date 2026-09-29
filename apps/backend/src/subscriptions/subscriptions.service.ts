import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  SubscriptionBillingProvider,
  SubscriptionStatus,
  SubscriptionType,
} from '@prisma/client';
import type { InputJsonValue } from '@prisma/client/runtime/library';
import type Stripe from 'stripe';

import { PrismaService } from '../prisma/prisma.service';
import {
  CheckoutInterval,
  CheckoutPlan,
  StripeCheckoutService,
} from './stripe-checkout.service';
import { RevenueCatService } from './revenuecat.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AdminEventLogService } from '../admin/admin-event-log.service';
import { PlanLimitsService } from './plan-limits.service';
import {
  hasSubscriptionAccess,
  isActiveStudioTrial,
} from './subscription-access.util';

/** ISO 4217 zero-decimal currencies (Stripe `unit_amount` is whole major units). */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
]);

function unitAmountToMajorUnits(
  unitAmount: number | null | undefined,
  currency: string | null | undefined,
): number | undefined {
  if (unitAmount == null) return undefined;
  const c = (currency ?? 'usd').toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(c)) return unitAmount;
  return unitAmount / 100;
}

function planToSubscriptionType(plan: CheckoutPlan): SubscriptionType {
  if (plan === 'enterprise') return SubscriptionType.ENTERPRISE;
  if (plan === 'solo') return SubscriptionType.SOLO;
  return SubscriptionType.STUDIO;
}

function planRank(type: string | null | undefined): number {
  const raw = String(type ?? '').toUpperCase();
  if (raw === 'ENTERPRISE') return 2;
  if (raw === 'STUDIO' || raw === 'PRO') return 1;
  return 0;
}

function subscriptionTypeFromStripeMeta(
  meta: Stripe.Metadata | null | undefined,
  priceId?: string | null,
): SubscriptionType {
  const plan = String(meta?.plan ?? '')
    .trim()
    .toLowerCase();
  if (plan === 'enterprise') return SubscriptionType.ENTERPRISE;
  if (plan === 'solo') return SubscriptionType.SOLO;
  if (plan === 'studio') return SubscriptionType.STUDIO;
  // Fallback: infer from known enterprise price env is done by caller via priceId tag
  if (priceId && /enterprise/i.test(priceId)) {
    return SubscriptionType.ENTERPRISE;
  }
  return SubscriptionType.STUDIO;
}

function mapStripeSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status,
  cancelAtPeriodEnd: boolean,
): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return SubscriptionStatus.ACTIVE;
    case 'past_due':
    case 'unpaid':
      return SubscriptionStatus.INACTIVE;
    case 'canceled':
      return cancelAtPeriodEnd
        ? SubscriptionStatus.CANCELLED
        : SubscriptionStatus.CANCELLED;
    case 'incomplete':
    case 'incomplete_expired':
      return SubscriptionStatus.EXPIRED;
    case 'paused':
      return SubscriptionStatus.INACTIVE;
    default:
      return SubscriptionStatus.INACTIVE;
  }
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly checkout: StripeCheckoutService,
    private readonly revenueCat: RevenueCatService,
    private readonly adminEventLog: AdminEventLogService,
    private readonly analytics: AnalyticsService,
    private readonly planLimits: PlanLimitsService,
  ) {}

  private async logSubscriptionFailed(
    userId: string,
    reason: string,
    metadata: InputJsonValue,
  ): Promise<void> {
    await this.adminEventLog.log({
      type: 'subscription_failed',
      severity: 'warn',
      message: reason,
      userId,
      metadata,
    });
  }

  async syncRevenueCat(userId: string) {
    return this.revenueCat.syncOwnerFromRevenueCat(userId);
  }

  async getCurrentForOwner(userId: string) {
    const studio = await this.prisma.studio.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!studio) {
      return null;
    }
    const sub = await this.prisma.subscription.findUnique({
      where: { studioId: studio.id },
    });
    return sub ? this.toCurrentPayload(sub) : null;
  }

  async getUsageForOwner(userId: string) {
    const studio = await this.prisma.studio.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!studio) {
      return null;
    }
    return this.planLimits.getStudioUsage(studio.id);
  }

  private isActiveRevenueCatPaid(sub: {
    billingProvider: SubscriptionBillingProvider;
    type: SubscriptionType;
    status: SubscriptionStatus;
    currentPeriodEnd: Date | null;
  }): boolean {
    if (sub.billingProvider !== SubscriptionBillingProvider.REVENUECAT) {
      return false;
    }
    if (sub.status !== SubscriptionStatus.ACTIVE) return false;
    if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() < Date.now()) {
      return false;
    }
    return true;
  }

  private isActiveStripePaid(sub: {
    billingProvider: SubscriptionBillingProvider;
    type: SubscriptionType;
    status: SubscriptionStatus;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  }): boolean {
    if (sub.billingProvider !== SubscriptionBillingProvider.STRIPE) {
      return false;
    }
    if (
      sub.status === SubscriptionStatus.ACTIVE ||
      (sub.cancelAtPeriodEnd &&
        sub.currentPeriodEnd != null &&
        sub.currentPeriodEnd.getTime() > Date.now())
    ) {
      return true;
    }
    return false;
  }

  async createCheckoutSessionForOwner(
    userId: string,
    email: string,
    params: {
      plan: CheckoutPlan;
      interval: CheckoutInterval;
      successUrl: string;
      cancelUrl: string;
    },
  ): Promise<string> {
    const studio = await this.prisma.studio.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!studio) {
      throw new NotFoundException('Studio not found');
    }

    const existing = await this.prisma.subscription.findUnique({
      where: { studioId: studio.id },
    });
    if (existing?.manualOverride) {
      throw new ConflictException({
        code: 'MANUAL_OVERRIDE',
        message: 'Subscription is managed by support; contact Henzo',
      });
    }
    if (existing && this.isActiveRevenueCatPaid(existing)) {
      throw new ConflictException({
        code: 'REVENUECAT_ACTIVE',
        message:
          'Active App Store / Google Play subscription. Manage billing in the store.',
      });
    }
    if (existing && this.isActiveStripePaid(existing)) {
      throw new ConflictException({
        code: 'STRIPE_ACTIVE',
        message:
          'Already subscribed via Stripe. Use change-plan to upgrade or the billing portal to manage.',
      });
    }

    if (
      !params.successUrl.startsWith('http://') &&
      !params.successUrl.startsWith('https://')
    ) {
      throw new BadRequestException(
        'successUrl must be an absolute http(s) URL',
      );
    }
    if (
      !params.cancelUrl.startsWith('http://') &&
      !params.cancelUrl.startsWith('https://')
    ) {
      throw new BadRequestException(
        'cancelUrl must be an absolute http(s) URL',
      );
    }

    return this.checkout.createSubscriptionCheckoutSession({
      userId,
      email,
      plan: params.plan,
      interval: params.interval,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      stripeCustomerId: existing?.stripeCustomerId,
    });
  }

  async createBillingPortalForOwner(
    userId: string,
    returnUrl: string,
  ): Promise<string> {
    const studio = await this.prisma.studio.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!studio) {
      throw new NotFoundException('Studio not found');
    }
    const sub = await this.prisma.subscription.findUnique({
      where: { studioId: studio.id },
    });
    if (
      !sub ||
      !sub.stripeCustomerId ||
      (sub.billingProvider !== SubscriptionBillingProvider.STRIPE &&
        sub.billingProvider !== SubscriptionBillingProvider.NONE)
    ) {
      throw new BadRequestException({
        code: 'NO_STRIPE_CUSTOMER',
        message: 'No Stripe billing account for this studio',
      });
    }
    if (!returnUrl.startsWith('http://') && !returnUrl.startsWith('https://')) {
      throw new BadRequestException(
        'returnUrl must be an absolute http(s) URL',
      );
    }
    return this.checkout.createBillingPortalSession({
      stripeCustomerId: sub.stripeCustomerId,
      returnUrl,
    });
  }

  /**
   * Upgrade/downgrade an active Stripe subscription (e.g. Studio → Enterprise).
   * Uses Stripe subscription item update + proration; does not open Checkout.
   */
  async changePlanForOwner(
    userId: string,
    params: { plan: CheckoutPlan; interval: CheckoutInterval },
  ) {
    const studio = await this.prisma.studio.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!studio) {
      throw new NotFoundException('Studio not found');
    }
    const existing = await this.prisma.subscription.findUnique({
      where: { studioId: studio.id },
    });
    if (!existing) {
      throw new NotFoundException('Subscription not found');
    }
    if (existing.manualOverride) {
      throw new ConflictException({
        code: 'MANUAL_OVERRIDE',
        message: 'Subscription is managed by support; contact Henzo',
      });
    }
    if (this.isActiveRevenueCatPaid(existing)) {
      throw new ConflictException({
        code: 'REVENUECAT_ACTIVE',
        message:
          'Active App Store / Google Play subscription. Manage billing in the store.',
      });
    }
    if (!this.isActiveStripePaid(existing) || !existing.stripeSubscriptionId) {
      throw new BadRequestException({
        code: 'NO_STRIPE_SUBSCRIPTION',
        message: 'No active Stripe subscription to change',
      });
    }

    const targetType = planToSubscriptionType(params.plan);
    if (existing.type === targetType && !existing.pendingType) {
      return this.toCurrentPayload(existing);
    }

    const priceId = this.checkout.resolvePriceId(params.plan, params.interval);
    const upgrading = planRank(targetType) > planRank(existing.type);

    if (!upgrading) {
      const effectiveAt = await this.checkout.scheduleSubscriptionPrice({
        stripeSubscriptionId: existing.stripeSubscriptionId,
        newPriceId: priceId,
        plan: params.plan,
        interval: params.interval,
      });
      const scheduled = await this.prisma.subscription.update({
        where: { id: existing.id },
        data: {
          pendingType: targetType,
          pendingEffectiveAt: effectiveAt,
          updatedAt: new Date(),
        },
      });
      this.analytics.track(userId, 'subscription_plan_changed', {
        studio_id: studio.id,
        provider: 'stripe',
        from: existing.type,
        to: targetType,
        interval: params.interval,
        when: 'period_end',
      });
      return this.toCurrentPayload(scheduled);
    }

    const stripeSub = await this.checkout.updateSubscriptionPrice({
      stripeSubscriptionId: existing.stripeSubscriptionId,
      newPriceId: priceId,
      plan: params.plan,
      interval: params.interval,
    });

    const updated = await this.applyStripeSubscription({
      studioId: studio.id,
      userId,
      stripeSub,
      tier: targetType,
    });

    this.analytics.track(userId, 'subscription_plan_changed', {
      studio_id: studio.id,
      provider: 'stripe',
      from: existing.type,
      to: targetType,
      interval: params.interval,
      when: 'now',
    });

    return this.toCurrentPayload(updated);
  }

  async syncCheckoutSession(userId: string, sessionId: string) {
    const session =
      await this.checkout.retrieveCheckoutSessionExpanded(sessionId);

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      const meta = {
        stripe_session_id: sessionId,
        reason: 'not_paid',
        payment_status: session.payment_status,
      };
      this.analytics.track(userId, 'subscription_failed', meta);
      await this.logSubscriptionFailed(
        userId,
        'Checkout session is not paid',
        meta,
      );
      throw new BadRequestException('Checkout session is not paid');
    }

    const refUserId =
      (session.client_reference_id?.trim() ||
        session.metadata?.userId?.trim()) ??
      '';
    if (!refUserId || refUserId !== userId) {
      const meta = {
        stripe_session_id: sessionId,
        reason: 'user_mismatch',
      };
      this.analytics.track(userId, 'subscription_failed', meta);
      await this.logSubscriptionFailed(
        userId,
        'Checkout session belongs to another user',
        meta,
      );
      throw new ForbiddenException('Checkout session belongs to another user');
    }

    const stripeSubRaw = session.subscription;
    if (!stripeSubRaw || typeof stripeSubRaw === 'string') {
      throw new BadRequestException('Stripe subscription missing on session');
    }
    const stripeSub = stripeSubRaw as Stripe.Subscription;

    const studio = await this.prisma.studio.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!studio) {
      throw new NotFoundException('Studio not found');
    }

    const existingSub = await this.prisma.subscription.findUnique({
      where: { studioId: studio.id },
    });
    if (existingSub?.manualOverride) {
      return this.toCurrentPayload(existingSub);
    }
    if (existingSub && this.isActiveRevenueCatPaid(existingSub)) {
      throw new ConflictException({
        code: 'REVENUECAT_ACTIVE',
        message:
          'Active App Store / Google Play subscription. Manage billing in the store.',
      });
    }

    const planMeta = String(
      session.metadata?.plan ?? stripeSub.metadata?.plan ?? 'studio',
    ).toLowerCase() as CheckoutPlan;
    const tier = planToSubscriptionType(
      planMeta === 'solo' || planMeta === 'enterprise' || planMeta === 'studio'
        ? planMeta
        : 'studio',
    );

    const updated = await this.applyStripeSubscription({
      studioId: studio.id,
      userId,
      stripeSub,
      tier,
      checkoutSessionId: sessionId,
    });

    return this.toCurrentPayload(updated);
  }

  async applyStripeSubscription(params: {
    studioId: string;
    userId?: string | null;
    stripeSub: Stripe.Subscription;
    tier?: SubscriptionType;
    checkoutSessionId?: string;
  }) {
    const { studioId, stripeSub } = params;
    const existing = await this.prisma.subscription.findUnique({
      where: { studioId },
    });
    if (existing?.manualOverride) {
      this.logger.log(
        `Stripe apply skipped studio=${studioId} (manualOverride)`,
      );
      return existing;
    }
    if (
      existing?.billingProvider === SubscriptionBillingProvider.REVENUECAT &&
      this.isActiveRevenueCatPaid(existing) &&
      existing.stripeSubscriptionId !== stripeSub.id
    ) {
      this.logger.warn(
        `Stripe apply ignored studio=${studioId} (active RevenueCat)`,
      );
      return existing;
    }

    const priceItem = stripeSub.items.data[0];
    const price = priceItem?.price;
    const priceId = price?.id ?? null;
    const tier =
      params.tier ??
      subscriptionTypeFromStripeMeta(stripeSub.metadata, priceId);
    const cancelAtPeriodEnd = Boolean(stripeSub.cancel_at_period_end);
    const status = mapStripeSubscriptionStatus(
      stripeSub.status,
      cancelAtPeriodEnd,
    );
    const periodEnd = new Date(stripeSub.current_period_end * 1000);
    const startAt = new Date(stripeSub.start_date * 1000);
    const customerId =
      typeof stripeSub.customer === 'string'
        ? stripeSub.customer
        : stripeSub.customer?.id;

    const stillPaid =
      status === SubscriptionStatus.ACTIVE ||
      (cancelAtPeriodEnd && periodEnd.getTime() > Date.now());

    const clearPending =
      !stillPaid ||
      (existing?.pendingType != null && existing.pendingType === tier) ||
      planRank(tier) > planRank(existing?.type);

    const data = {
      type: stillPaid ? tier : SubscriptionType.SOLO,
      ...(clearPending ? { pendingType: null, pendingEffectiveAt: null } : {}),
      status: stillPaid ? status : SubscriptionStatus.CANCELLED,
      startDate: startAt,
      currentPeriodEnd: periodEnd,
      billingProvider: stillPaid
        ? SubscriptionBillingProvider.STRIPE
        : SubscriptionBillingProvider.NONE,
      stripeCustomerId: customerId ?? existing?.stripeCustomerId ?? null,
      stripeSubscriptionId: stillPaid ? stripeSub.id : null,
      stripePriceId: stillPaid ? priceId : null,
      cancelAtPeriodEnd: stillPaid ? cancelAtPeriodEnd : false,
      updatedAt: new Date(),
    };

    const updated = await this.prisma.subscription.upsert({
      where: { studioId },
      create: {
        studioId,
        ...data,
      },
      update: data,
    });

    const prevType = existing?.type ?? SubscriptionType.SOLO;
    const prevCancel = Boolean(existing?.cancelAtPeriodEnd);
    const prevPaid =
      !!existing &&
      (existing.billingProvider === SubscriptionBillingProvider.STRIPE ||
        existing.billingProvider === SubscriptionBillingProvider.REVENUECAT) &&
      (existing.status === SubscriptionStatus.ACTIVE ||
        (existing.cancelAtPeriodEnd &&
          existing.currentPeriodEnd != null &&
          existing.currentPeriodEnd.getTime() > Date.now()));

    let eventType:
      | 'subscription_started'
      | 'subscription_updated'
      | 'subscription_cancelled'
      | null = null;
    let eventMessage = '';

    if (!prevPaid && stillPaid) {
      eventType = 'subscription_started';
      eventMessage = `Web (Stripe): ${tier} activated${
        cancelAtPeriodEnd ? ' (cancels at period end)' : ''
      }`;
    } else if (prevPaid && !stillPaid) {
      eventType = 'subscription_cancelled';
      eventMessage = `Web (Stripe): subscription ended (was ${prevType})`;
    } else if (stillPaid) {
      const changed =
        prevType !== updated.type ||
        prevCancel !== cancelAtPeriodEnd ||
        existing?.stripeSubscriptionId !== stripeSub.id;
      if (changed) {
        eventType = 'subscription_updated';
        if (!prevCancel && cancelAtPeriodEnd) {
          eventMessage = `Web (Stripe): cancel scheduled at period end (${tier})`;
        } else if (prevCancel && !cancelAtPeriodEnd) {
          eventMessage = `Web (Stripe): cancellation reversed (${tier})`;
        } else if (prevType !== updated.type) {
          eventMessage = `Web (Stripe): plan ${prevType} → ${updated.type}`;
        } else {
          eventMessage = `Web (Stripe): subscription updated (${tier})`;
        }
      }
    }

    if (eventType) {
      await this.adminEventLog.log({
        type: eventType,
        severity: eventType === 'subscription_cancelled' ? 'warn' : 'info',
        message: eventMessage,
        studioId,
        userId: params.userId ?? undefined,
        metadata: {
          provider: 'stripe',
          channel: 'web',
          tier: updated.type,
          status: updated.status,
          cancelAtPeriodEnd,
          stripeSubscriptionId: stripeSub.id,
          stripePriceId: priceId,
          checkoutSessionId: params.checkoutSessionId ?? null,
        },
      });
    }

    if (params.userId && stillPaid) {
      const amount = unitAmountToMajorUnits(
        price?.unit_amount ?? null,
        price?.currency ?? null,
      );
      this.analytics.track(params.userId, 'subscription_started', {
        studio_id: studioId,
        provider: 'stripe',
        tier: updated.type,
        stripe_session_id: params.checkoutSessionId ?? null,
        stripe_price_id: priceId,
        amount: amount ?? null,
        currency: price?.currency ?? null,
      });
    }

    return updated;
  }

  async applyStripeSubscriptionByCustomerOrSubId(
    stripeSub: Stripe.Subscription,
  ) {
    const customerId =
      typeof stripeSub.customer === 'string'
        ? stripeSub.customer
        : stripeSub.customer?.id;

    let row = await this.prisma.subscription.findFirst({
      where: {
        OR: [
          { stripeSubscriptionId: stripeSub.id },
          ...(customerId ? [{ stripeCustomerId: customerId }] : []),
        ],
      },
      include: { Studio: { select: { ownerId: true } } },
    });

    if (!row) {
      const userId = String(stripeSub.metadata?.userId ?? '').trim();
      if (userId) {
        const studio = await this.prisma.studio.findFirst({
          where: { ownerId: userId },
          select: { id: true, ownerId: true },
        });
        if (studio) {
          row = await this.prisma.subscription.findUnique({
            where: { studioId: studio.id },
            include: { Studio: { select: { ownerId: true } } },
          });
          if (!row) {
            // create via apply
            return this.applyStripeSubscription({
              studioId: studio.id,
              userId: studio.ownerId,
              stripeSub,
            });
          }
        }
      }
    }

    if (!row) {
      this.logger.warn(
        `Stripe subscription ${stripeSub.id} has no matching studio`,
      );
      return null;
    }

    return this.applyStripeSubscription({
      studioId: row.studioId,
      userId: row.Studio.ownerId,
      stripeSub,
    });
  }

  async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    if (session.mode !== 'subscription') return;
    const userId =
      (session.client_reference_id?.trim() ||
        session.metadata?.userId?.trim()) ??
      '';
    if (!userId) {
      this.logger.warn('checkout.session.completed without userId');
      return;
    }

    const subId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    if (!subId) {
      this.logger.warn('checkout.session.completed without subscription id');
      return;
    }

    const stripe = this.checkout.getStripe();
    const stripeSub = await stripe.subscriptions.retrieve(subId);
    const plan = String(session.metadata?.plan ?? 'studio').toLowerCase();
    const tier = planToSubscriptionType(
      plan === 'enterprise' || plan === 'solo' || plan === 'studio'
        ? plan
        : 'studio',
    );

    const studio = await this.prisma.studio.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!studio) {
      this.logger.warn(`checkout.session.completed: no studio for ${userId}`);
      return;
    }

    await this.applyStripeSubscription({
      studioId: studio.id,
      userId,
      stripeSub,
      tier,
      checkoutSessionId: session.id,
    });
  }

  private toCurrentPayload(sub: {
    id: string;
    studioId: string;
    type: string;
    status: string;
    startDate: Date;
    currentPeriodEnd?: Date | null;
    billingProvider?: SubscriptionBillingProvider | string;
    cancelAtPeriodEnd?: boolean;
    stripeCustomerId?: string | null;
    pendingType?: string | null;
    pendingEffectiveAt?: Date | null;
  }) {
    return {
      id: sub.id,
      studioId: sub.studioId,
      type: sub.type,
      status: sub.status,
      startDate: sub.startDate.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      billingProvider: sub.billingProvider ?? SubscriptionBillingProvider.NONE,
      cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
      hasStripeCustomer: Boolean(sub.stripeCustomerId),
      pendingType: sub.pendingType ?? null,
      pendingEffectiveAt: sub.pendingEffectiveAt?.toISOString() ?? null,
      isTrial: isActiveStudioTrial(sub),
      hasAccess: hasSubscriptionAccess(sub),
    };
  }
}
