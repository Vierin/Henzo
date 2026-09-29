import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export type SubscriptionPriceSource = 'stripe' | 'fallback';

export interface TierPrices {
  /** Major units (e.g. 22.99 EUR). */
  monthly: number;
  annual: number;
  twelveMonthsCompare: number;
  annualSavePercent: number;
}

export interface SoloPrice {
  /** Major units (EUR fallback, or USD when the Stripe Solo price is set). */
  monthly: number;
  currency: 'EUR' | 'USD';
}

export interface ProPricesPayload {
  currency: 'EUR';
  source: SubscriptionPriceSource;
  /** Studio amounts at root — web/mobile convenience. */
  monthly: number;
  annual: number;
  twelveMonthsCompare: number;
  annualSavePercent: number;
  studio: TierPrices;
  enterprise: TierPrices;
  solo: SoloPrice;
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

  /** Yearly billing is off. `annual` stays 12× monthly so clients still have a number. */
  private tierFromMonthly(monthly: number): TierPrices {
    const twelveMonthsCompare = Math.round(monthly * 12 * 100) / 100;
    return {
      monthly,
      annual: twelveMonthsCompare,
      twelveMonthsCompare,
      annualSavePercent: 0,
    };
  }

  private parseEurEnv(key: string, fallback: number): number {
    const raw = this.config.get<string>(key)?.trim();
    if (!raw) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  private getFallbackPrices(): ProPricesPayload {
    const studioMonthly = this.parseEurEnv(
      'FALLBACK_STUDIO_PRICE_MONTHLY_EUR',
      22.99,
    );
    const enterpriseMonthly = this.parseEurEnv(
      'FALLBACK_ENTERPRISE_PRICE_MONTHLY_EUR',
      79.99,
    );
    const soloMonthly = this.parseEurEnv(
      'FALLBACK_SOLO_PRICE_MONTHLY_EUR',
      7.99,
    );
    const studio = this.tierFromMonthly(studioMonthly);
    const enterprise = this.tierFromMonthly(enterpriseMonthly);
    return {
      currency: 'EUR',
      source: 'fallback',
      monthly: studio.monthly,
      annual: studio.annual,
      twelveMonthsCompare: studio.twelveMonthsCompare,
      annualSavePercent: studio.annualSavePercent,
      studio,
      enterprise,
      solo: { monthly: soloMonthly, currency: 'EUR' },
    };
  }

  /** Stripe `unit_amount` → major currency units (EUR cents → euros). */
  private unitAmountToMajor(unitAmount: number, currency: string): number {
    const c = currency.toLowerCase();
    if (c === 'eur' || c === 'usd' || c === 'pln') {
      return Math.round(unitAmount) / 100;
    }
    // zero-decimal (legacy VND etc.)
    return unitAmount;
  }

  /** Solo price is USD. Returns null when the Stripe price is missing or not USD. */
  private async retrieveUsdAmount(
    priceId: string | undefined,
  ): Promise<number | null> {
    if (!this.stripe || !priceId?.trim()) return null;
    try {
      const price = await this.stripe.prices.retrieve(priceId.trim());
      if (price.unit_amount == null) return null;
      if (price.currency !== 'usd') {
        this.logger.warn(
          `Expected USD Stripe price for Solo, got ${price.currency} for ${priceId}`,
        );
        return null;
      }
      return this.unitAmountToMajor(price.unit_amount, price.currency);
    } catch (e) {
      this.logger.warn(`Stripe prices retrieve failed for ${priceId}: ${e}`);
      return null;
    }
  }

  private async retrieveMajorAmount(
    priceId: string | undefined,
  ): Promise<number | null> {
    if (!this.stripe || !priceId?.trim()) return null;
    try {
      const price = await this.stripe.prices.retrieve(priceId.trim());
      if (price.unit_amount == null) return null;
      if (price.currency !== 'eur') {
        this.logger.warn(
          `Expected EUR Stripe price, got ${price.currency} for ${priceId}`,
        );
      }
      return this.unitAmountToMajor(price.unit_amount, price.currency);
    } catch (e) {
      this.logger.warn(`Stripe prices retrieve failed for ${priceId}: ${e}`);
      return null;
    }
  }

  private async fetchFromStripe(): Promise<ProPricesPayload | null> {
    const studioMonthlyId = this.config.get<string>(
      'STRIPE_STUDIO_PRICE_MONTHLY_ID',
    );
    const enterpriseMonthlyId = this.config.get<string>(
      'STRIPE_ENTERPRISE_PRICE_MONTHLY_ID',
    );
    const soloMonthlyId = this.config.get<string>(
      'STRIPE_SOLO_PRICE_MONTHLY_ID',
    );

    const [sm, em, soloAmount] = await Promise.all([
      this.retrieveMajorAmount(studioMonthlyId),
      this.retrieveMajorAmount(enterpriseMonthlyId),
      this.retrieveUsdAmount(soloMonthlyId),
    ]);

    if (sm == null && em == null && soloAmount == null) {
      return null;
    }

    const fallback = this.getFallbackPrices();
    const studio = this.tierFromMonthly(sm ?? fallback.studio.monthly);
    const enterprise = this.tierFromMonthly(em ?? fallback.enterprise.monthly);

    return {
      currency: 'EUR',
      source: 'stripe',
      monthly: studio.monthly,
      annual: studio.annual,
      twelveMonthsCompare: studio.twelveMonthsCompare,
      annualSavePercent: studio.annualSavePercent,
      studio,
      enterprise,
      solo:
        soloAmount != null
          ? { monthly: soloAmount, currency: 'USD' }
          : fallback.solo,
    };
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
      this.logger.debug('Using fallback Pro subscription prices (EUR)');
    }
    return payload;
  }
}
