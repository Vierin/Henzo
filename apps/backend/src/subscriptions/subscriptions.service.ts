import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type Stripe from 'stripe';

import { PrismaService } from '../prisma/prisma.service';
import { StripeCheckoutService } from './stripe-checkout.service';
import { AnalyticsService } from '../analytics/analytics.service';

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

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly checkout: StripeCheckoutService,
    private readonly analytics: AnalyticsService,
  ) {}

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

  async syncCheckoutSession(userId: string, sessionId: string) {
    const session =
      await this.checkout.retrieveCheckoutSessionExpanded(sessionId);

    if (session.payment_status !== 'paid') {
      this.analytics.track(userId, 'subscription_failed', {
        stripe_session_id: sessionId,
        reason: 'not_paid',
        payment_status: session.payment_status,
      });
      throw new BadRequestException('Checkout session is not paid');
    }

    const refUserId =
      (session.client_reference_id?.trim() ||
        session.metadata?.userId?.trim()) ??
      '';
    if (!refUserId || refUserId !== userId) {
      this.analytics.track(userId, 'subscription_failed', {
        stripe_session_id: sessionId,
        reason: 'user_mismatch',
      });
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

    const periodEnd = new Date(stripeSub.current_period_end * 1000);
    const startAt = new Date(stripeSub.start_date * 1000);

    const priceItem = stripeSub.items.data[0];
    const price = priceItem?.price;
    const amount = unitAmountToMajorUnits(
      price?.unit_amount ?? null,
      price?.currency ?? null,
    );

    const updateData: Prisma.SubscriptionUncheckedUpdateInput = {
      type: 'PRO',
      status: 'ACTIVE',
      startDate: startAt,
      updatedAt: new Date(),
      ...(amount != null ? { amount } : {}),
    };
    // `currentPeriodEnd` exists in schema/migration; cast keeps TS green
    // until local Prisma client is regenerated on Windows.
    (updateData as Record<string, unknown>)['currentPeriodEnd'] = periodEnd;

    const updated = await this.prisma.subscription.update({
      where: { studioId: studio.id },
      data: updateData,
    });

    this.analytics.track(userId, 'subscription_started', {
      studio_id: studio.id,
      stripe_session_id: sessionId,
      stripe_price_id: price?.id,
      amount: amount ?? null,
      currency: price?.currency ?? null,
    });

    return this.toCurrentPayload(updated);
  }

  private toCurrentPayload(sub: {
    id: string;
    studioId: string;
    type: string;
    status: string;
    startDate: Date;
    amount: number;
    currentPeriodEnd?: Date | null;
  }) {
    return {
      id: sub.id,
      salonId: sub.studioId,
      type: sub.type,
      status: sub.status,
      startDate: sub.startDate.toISOString(),
      amount: sub.amount,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    };
  }
}
