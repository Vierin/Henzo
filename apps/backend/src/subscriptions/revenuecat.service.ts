import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AdminEventLogService } from '../admin/admin-event-log.service';
import { isPaidSubscriptionType } from './subscription-tier.util';

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

  private get studioEntitlementId(): string {
    return (
      this.config.get<string>('REVENUECAT_STUDIO_ENTITLEMENT_ID')?.trim() ||
      this.config.get<string>('REVENUECAT_ENTITLEMENT_ID')?.trim() ||
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
    if (this.hasActiveStoreSubscription(subscriber)) {
      return SubscriptionType.STUDIO;
    }
    return SubscriptionType.SOLO;
  }

  private resolvePeriodEnd(subscriber: RcSubscriberResponse): Date | null {
    const entitlements = subscriber.subscriber?.entitlements ?? {};
    const ids = [this.enterpriseEntitlementId, this.studioEntitlementId];
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

  async syncOwnerFromRevenueCat(userId: string) {
    const studio = await this.prisma.studio.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!studio) {
      throw new BadRequestException('Studio not found');
    }

    const subscriber = await this.fetchSubscriber(userId);
    const tier = this.resolveSubscriptionType(subscriber);
    const periodEnd = this.resolvePeriodEnd(subscriber);
    this.logger.log(
      `RevenueCat sync user=${userId} tier=${tier} entitlements=${Object.keys(subscriber.subscriber?.entitlements ?? {}).join(',')}`,
    );

    const now = new Date();
    const subscriptionData = {
      type: tier,
      status: 'ACTIVE' as const,
      updatedAt: now,
      ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
    };

    const updated = await this.prisma.subscription.upsert({
      where: { studioId: studio.id },
      create: {
        studioId: studio.id,
        startDate: now,
        amount: 0,
        ...subscriptionData,
      },
      update: subscriptionData,
    });

    if (isPaidSubscriptionType(updated.type)) {
      this.analytics.track(userId, 'subscription_started', {
        studio_id: studio.id,
        provider: 'revenuecat',
        tier: updated.type,
      });
    }

    return {
      id: updated.id,
      studioId: updated.studioId,
      type: updated.type,
      status: updated.status,
      startDate: updated.startDate.toISOString(),
      amount: updated.amount,
      currentPeriodEnd: updated.currentPeriodEnd?.toISOString() ?? null,
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
