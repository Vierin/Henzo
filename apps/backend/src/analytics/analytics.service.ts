import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

/// Тонкая обёртка над GA4 Measurement Protocol.
/// Fire-and-forget: ошибки логируем как warn, основной поток не блокируем.
/// Если GA4_MEASUREMENT_ID или GA4_API_SECRET не заданы — track() no-op.
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly measurementId?: string;
  private readonly apiSecret?: string;
  private readonly endpoint = 'https://www.google-analytics.com/mp/collect';

  constructor(private readonly config: ConfigService) {
    this.measurementId = this.config.get<string>('GA4_MEASUREMENT_ID');
    this.apiSecret = this.config.get<string>('GA4_API_SECRET');
    if (!this.measurementId || !this.apiSecret) {
      this.logger.log(
        'GA4 disabled (missing GA4_MEASUREMENT_ID/GA4_API_SECRET)',
      );
    }
  }

  track(
    userId: string | null,
    event: string,
    params: Record<string, unknown> = {},
  ): void {
    if (!this.measurementId || !this.apiSecret) return;

    const clientId = userId ?? `anon-${randomUUID()}`;
    const body = {
      client_id: clientId,
      user_id: userId ?? undefined,
      events: [
        {
          name: event,
          params: { source: 'backend', ...params },
        },
      ],
    };

    const url = `${this.endpoint}?measurement_id=${encodeURIComponent(
      this.measurementId,
    )}&api_secret=${encodeURIComponent(this.apiSecret)}`;

    // fire-and-forget: основной поток не блокируется
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) {
          this.logger.warn(`GA4 ${event} HTTP ${res.status}`);
        }
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`GA4 ${event} failed: ${msg}`);
      });
  }
}
