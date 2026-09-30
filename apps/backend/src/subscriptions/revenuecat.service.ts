import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SubscriptionBillingProvider,
  SubscriptionStatus,
  SubscriptionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AdminEventLogService } from '../admin/admin-event-log.service';
import { isActiveStudioTrial } from './subscription-access.util';
import { hasSubscriptionAccess } from './subscription-access.util';

type RcEntitlement = {
  expires_date: string | null;
  product_identifier?: string;
  purchase_date?: string;
};

type RcSubscriberResponse = {
  subscriber?: {
    entitlements?: Record<string, RcEntitlement>;
    subscriptions?: Record<
      string,
      { expires_date?: string | null; purchase_date?: string | null }
    >;
  };
};

@Injectable()
export class RevenueCatService {
  private readonly logger = new Logger(RevenueCatService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly adminEventLog: AdminEventLogService,
  ) {}

  private get secretKey(): string | undefined {
    return this.config.get<string>('REVENUECAT_SECRET_API_KEY')?.trim();
  }

  private get soloEntitlementId(): string {
    return (
      this.config.get<string>('REVENUECAT_SOLO_ENTITLEMENT_ID')?.trim() ||
      'premium_solo'
    );
  }

  private get studioEntitlementId(): string {
    return (
      this.config.get<string>('REVENUECAT_STUDIO_ENTITLEMENT_ID')?.trim() ||
      'premium_studio'
    );
  }

  private get enterpriseEntitlementId(): string {
    return (
      this.config.get<string>('REVENUECAT_ENTERPRISE_ENTITLEMENT_ID')?.trim() ||
      'premium_enterprise'
    );
  }

  private get webhookAuth(): string | undefined {
    return this.config.get<string>('REVENUECAT_WEBHOOK_AUTHORIZATION')?.trim();
  }

  isWebhookAuthorized(authorizationHeader: string | undefined): boolean {
    const expected = this.webhookAuth;
    if (!expected) return false;
    const header = authorizationHeader?.trim() ?? '';
    if (header === expected) return true;
    if (header === `Bearer ${expected}`) return true;
    return false;
  }

  async fetchSubscriber(appUserId: string): Promise<RcSubscriberResponse> {
    const key = this.secretKey;
    if (!key) {
      throw new ServiceUnavailableException(
        'RevenueCat is not configured (REVENUECAT_SECRET_API_KEY)',
      );
    }
    const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(
        `RevenueCat GET subscriber ${appUserId} → ${res.status}: ${text.slice(0, 200)}`,
      );
      throw new BadRequestException('Could not load RevenueCat subscriber');
    }
    return (await res.json()) as RcSubscriberResponse;
  }

  private isEntitlementRecordActive(ent: RcEntitlement): boolean {
    if (!ent.expires_date) return true;
    const expires = new Date(ent.expires_date);
    return !Number.isNaN(expires.getTime()) && expires > new Date();
  }

  private isEntitlementIdActive(
    subscriber: RcSubscriberResponse,
    entitlementId: string,
  ): boolean {
    const entitlements = subscriber.subscriber?.entitlements ?? {};
    const target = entitlementId.toLowerCase();
    for (const [key, ent] of Object.entries(entitlements)) {
      if (key.toLowerCase() === target && this.isEntitlementRecordActive(ent)) {
        return true;
      }
    }
    return false;
  }

  private hasActiveStoreSubscription(
    subscriber: RcSubscriberResponse,
  ): boolean {
    const subs = subscriber.subscriber?.subscriptions ?? {};
    const now = new Date();
    for (const sub of Object.values(subs)) {
      if (!sub.expires_date) return true;
      const expires = new Date(sub.expires_date);
      if (!Number.isNaN(expires.getTime()) && expires > now) return true;
    }
    return false;
  }

  resolveSubscriptionType(subscriber: RcSubscriberResponse): SubscriptionType {
    if (this.isEntitlementIdActive(subscriber, this.enterpriseEntitlementId)) {
      return SubscriptionType.ENTERPRISE;
    }
    if (this.isEntitlementIdActive(subscriber, this.studioEntitlementId)) {
      return SubscriptionType.STUDIO;
    }
    if (this.isEntitlementIdActive(subscriber, this.soloEntitlementId)) {
      return SubscriptionType.SOLO;
    }
    if (this.hasActiveStoreSubscription(subscriber)) {
      return SubscriptionType.STUDIO;
    }
    return SubscriptionType.SOLO;
  }

  /** Store purchase is active (Solo, Studio, or Enterprise). */
  private hasActiveStoreEntitlement(subscriber: RcSubscriberResponse): boolean {
    return (
      this.isEntitlementIdActive(subscriber, this.enterpriseEntitlementId) ||
      this.isEntitlementIdActive(subscriber, this.studioEntitlementId) ||
      this.isEntitlementIdActive(subscriber, this.soloEntitlementId) ||
      this.hasActiveStoreSubscription(subscriber)
    );
  }

  private resolvePeriodEnd(subscriber: RcSubscriberResponse): Date | null {
    const entitlements = subscriber.subscriber?.entitlements ?? {};
    const ids = [
      this.enterpriseEntitlementId,
      this.studioEntitlementId,
      this.soloEntitlementId,
    ];
    for (const id of ids) {
      const ent = entitlements[id];
      if (ent?.expires_date) {
        const d = new Date(ent.expires_date);
        if (!Number.isNaN(d.getTime())) return d;
      }
      const target = id.toLowerCase();
      for (const [key, ent] of Object.entries(entitlements)) {
        if (key.toLowerCase() === target && ent.expires_date) {
          const d = new Date(ent.expires_date);
          if (!Number.isNaN(d.getTime())) return d;
        }
      }
    }
    const subs = subscriber.subscriber?.subscriptions;
    if (subs) {
      for (const sub of Object.values(subs)) {
        if (sub.expires_date) {
          const d = new Date(sub.expires_date);
          if (!Number.isNaN(d.getTime())) return d;
        }
      }
    }
    return null;
  }

  private isActiveStripeGuard(sub: {
    billingProvider: SubscriptionBillingProvider;
    type: SubscriptionType;
    status: SubscriptionStatus;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  }): boolean {
    if (sub.billingProvider !== SubscriptionBillingProvider.STRIPE) {
      return false;
    }
    if (sub.status === SubscriptionStatus.ACTIVE) return true;
    if (
      sub.cancelAtPeriodEnd &&
      sub.currentPeriodEnd != null &&
      sub.currentPeriodEnd.getTime() > Date.now()
    ) {
      return true;
    }
    return false;
  }

  async syncOwnerFromRevenueCat(userId: string) {
    const studio = await this.prisma.studio.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!studio) {
      throw new BadRequestException('Studio not found');
    }

    const existing = await this.prisma.subscription.findUnique({
      where: { studioId: studio.id },
    });
    if (existing?.manualOverride) {
      this.logger.log(
        `RevenueCat sync skipped for user=${userId} (manualOverride)`,
      );
      return this.toPayload(existing);
    }

    if (existing && this.isActiveStripeGuard(existing)) {
      this.logger.log(
        `RevenueCat sync skipped for user=${userId} (active Stripe billing)`,
      );
      return this.toPayload(existing);
    }

    const subscriber = await this.fetchSubscriber(userId);
    const tier = this.resolveSubscriptionType(subscriber);
    const periodEnd = this.resolvePeriodEnd(subscriber);
    const paid = this.hasActiveStoreEntitlement(subscriber);
    if (!paid && existing && isActiveStudioTrial(existing)) {
      this.logger.log(
        `RevenueCat sync skipped for user=${userId} (active Studio trial)`,
      );
      return this.toPayload(existing);
    }
    this.logger.log(
      `RevenueCat sync user=${userId} tier=${tier} entitlements=${Object.keys(subscriber.subscriber?.entitlements ?? {}).join(',')}`,
    );

    const now = new Date();
    const subscriptionData = {
      type: tier,
      status: SubscriptionStatus.ACTIVE,
      updatedAt: now,
      ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
      billingProvider: paid
        ? SubscriptionBillingProvider.REVENUECAT
        : existing?.billingProvider === SubscriptionBillingProvider.REVENUECAT
          ? SubscriptionBillingProvider.NONE
          : (existing?.billingProvider ?? SubscriptionBillingProvider.NONE),
      ...(paid
        ? {}
        : existing?.billingProvider === SubscriptionBillingProvider.REVENUECAT
          ? {
              cancelAtPeriodEnd: false,
            }
          : {}),
    };

    const updated = await this.prisma.subscription.upsert({
      where: { studioId: studio.id },
      create: {
        studioId: studio.id,
        startDate: now,
        ...subscriptionData,
      },
      update: subscriptionData,
    });

    const prevPaid =
      !!existing &&
      existing.billingProvider === SubscriptionBillingProvider.REVENUECAT &&
      existing.status === SubscriptionStatus.ACTIVE;
    const nowPaid = paid;

    let eventType:
      | 'subscription_started'
      | 'subscription_updated'
      | 'subscription_cancelled'
      | null = null;
    let eventMessage = '';

    if (!prevPaid && nowPaid) {
      eventType = 'subscription_started';
      eventMessage = `Mobile (App Store / Play): ${updated.type} activated`;
    } else if (prevPaid && !nowPaid) {
      eventType = 'subscription_cancelled';
      eventMessage = `Mobile (App Store / Play): subscription ended (was ${existing?.type})`;
    } else if (
      nowPaid &&
      existing &&
      (existing.type !== updated.type ||
        existing.currentPeriodEnd?.getTime() !==
          updated.currentPeriodEnd?.getTime())
    ) {
      eventType = 'subscription_updated';
      eventMessage =
        existing.type !== updated.type
          ? `Mobile (App Store / Play): plan ${existing.type} → ${updated.type}`
          : `Mobile (App Store / Play): subscription updated (${updated.type})`;
    }

    if (eventType) {
      await this.adminEventLog.log({
        type: eventType,
        severity: eventType === 'subscription_cancelled' ? 'warn' : 'info',
        message: eventMessage,
        studioId: studio.id,
        userId,
        metadata: {
          provider: 'revenuecat',
          channel: 'mobile',
          tier: updated.type,
          status: updated.status,
        },
      });
    }

    if (paid) {
      this.analytics.track(userId, 'subscription_started', {
        studio_id: studio.id,
        provider: 'revenuecat',
        tier: updated.type,
      });
    }

    return this.toPayload(updated);
  }

  private toPayload(current: {
    id: string;
    studioId: string;
    type: string;
    status: string;
    startDate: Date;
    currentPeriodEnd: Date | null;
    billingProvider?: string;
    cancelAtPeriodEnd?: boolean;
  }) {
    return {
      id: current.id,
      studioId: current.studioId,
      type: current.type,
      status: current.status,
      startDate: current.startDate.toISOString(),
      currentPeriodEnd: current.currentPeriodEnd?.toISOString() ?? null,
      billingProvider:
        current.billingProvider ?? SubscriptionBillingProvider.NONE,
      cancelAtPeriodEnd: Boolean(current.cancelAtPeriodEnd),
      isTrial: isActiveStudioTrial(current),
      hasAccess: hasSubscriptionAccess(current),
    };
  }

  async handleWebhookEvent(payload: Record<string, unknown>) {
    const event = payload.event as Record<string, unknown> | undefined;
    if (!event) {
      this.logger.warn('RevenueCat webhook without event');
      return { ok: true };
    }
    const appUserId = String(event.app_user_id ?? '').trim();
    if (!appUserId) {
      this.logger.warn('RevenueCat webhook without app_user_id');
      return { ok: true };
    }
    const type = String(event.type ?? '');
    this.logger.log(`RevenueCat webhook ${type} for ${appUserId}`);
    try {
      await this.syncOwnerFromRevenueCat(appUserId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`RevenueCat sync failed for ${appUserId}: ${msg}`);
      await this.adminEventLog.log({
        type: 'revenuecat_webhook_error',
        severity: 'error',
        message: msg,
        userId: appUserId,
        metadata: { eventType: type },
      });
    }
    return { ok: true };
  }
}
