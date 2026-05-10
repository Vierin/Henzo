import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export type SubscriptionPriceSource = 'stripe' | 'fallback';

export interface ProPricesPayload {
  monthlyVnd: number;
  annualVnd: number;
  twelveMonthsCompareVnd: number;
  annualSavePercent: number;
  source: SubscriptionPriceSource;
}

@Injectable()
export class StripePricingService {
  private readonly logger = new Logger(StripePricingService.name);
  private stripe: Stripe | null = null;

  private cache: { expiresAtMs: number; payload: ProPricesPayload } | null =
    null;

  constructor(private readonly config: ConfigService) {
    const sk = this.config.get<string>('STRIPE_SECRET_KEY');
    if (sk) {
      this.stripe = new Stripe(sk);
    }
  }

  private getFallbackPrices(): ProPricesPayload {
    const monthlyVnd = parseInt(
      this.config.get<string>('FALLBACK_PRO_PRICE_MONTHLY_VND') || '395000',
      10,
    );
    const annualVnd = parseInt(
      this.config.get<string>('FALLBACK_PRO_PRICE_ANNUAL_VND') || '3980000',
      10,
    );
    const twelveMonthsCompareVnd = monthlyVnd * 12;
    const annualSavePercent =
      twelveMonthsCompareVnd > 0 && twelveMonthsCompareVnd > annualVnd
        ? Math.round(
            ((twelveMonthsCompareVnd - annualVnd) / twelveMonthsCompareVnd) *
              100,
          )
        : 0;
    return {
      monthlyVnd,
      annualVnd,
      twelveMonthsCompareVnd,
      annualSavePercent,
      source: 'fallback',
    };
  }

  private async fetchFromStripe(): Promise<ProPricesPayload | null> {
    const monthlyId = this.config.get<string>('STRIPE_MONTHLY_PRICE_ID');
    const annualId = this.config.get<string>('STRIPE_YEARLY_PRICE_ID');
    if (!this.stripe || !monthlyId || !annualId) {
      return null;
    }
    try {
      const [monthlyPrice, annualPrice] = await Promise.all([
        this.stripe.prices.retrieve(monthlyId),
        this.stripe.prices.retrieve(annualId),
      ]);
      const m = monthlyPrice.unit_amount;
      const a = annualPrice.unit_amount;
      if (m == null || a == null) {
        this.logger.warn('Stripe price missing unit_amount');
        return null;
      }
      if (monthlyPrice.currency !== 'vnd' || annualPrice.currency !== 'vnd') {
        this.logger.warn(
          `Unexpected Stripe currency monthly=${monthlyPrice.currency} annual=${annualPrice.currency}`,
        );
      }
      const twelveMonthsCompareVnd = m * 12;
      const annualSavePercent =
        twelveMonthsCompareVnd > a
          ? Math.round(
              ((twelveMonthsCompareVnd - a) / twelveMonthsCompareVnd) * 100,
            )
          : 0;
      return {
        monthlyVnd: m,
        annualVnd: a,
        twelveMonthsCompareVnd,
        annualSavePercent,
        source: 'stripe',
      };
    } catch (e) {
      this.logger.warn(`Stripe prices retrieve failed: ${e}`);
      return null;
    }
  }

  /** In-memory TTL cache; refresh from Stripe after expiry. */
  async getProPrices(): Promise<ProPricesPayload> {
    const ttlSec = parseInt(
      this.config.get<string>('STRIPE_PRICES_CACHE_TTL_SEC') || '3600',
      10,
    );
    const ttlMs = Math.max(60, ttlSec) * 1000;
    const now = Date.now();
    if (this.cache && this.cache.expiresAtMs > now) {
      return this.cache.payload;
    }

    const fromStripe = await this.fetchFromStripe();
    const payload = fromStripe ?? this.getFallbackPrices();
    this.cache = { expiresAtMs: now + ttlMs, payload };
    if (!fromStripe) {
      this.logger.debug('Using fallback Pro subscription prices for mobile');
    }
    return payload;
  }
}
