import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { AdminEventLogService } from './admin-event-log.service';

/// Optional: snapshot crash-free rate from env into AdminEventLog (hourly).
/// Replace with Firebase Crashlytics API when credentials are available.
@Injectable()
export class AdminCrashFreeCron {
  private readonly logger = new Logger(AdminCrashFreeCron.name);

  constructor(
    private readonly config: ConfigService,
    private readonly eventLog: AdminEventLogService,
  ) {}

  @Cron('0 * * * *')
  async snapshotFromEnv(): Promise<void> {
    const raw = this.config.get<string>('ADMIN_CRASH_FREE_RATE')?.trim();
    if (!raw) return;
    const rate = Number(raw);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      this.logger.warn('ADMIN_CRASH_FREE_RATE invalid, skipping snapshot');
      return;
    }
    await this.eventLog.log({
      type: 'crash_free_rate_snapshot',
      severity: 'info',
      message: `Crash-free rate ${rate}%`,
      metadata: { rate, source: 'env' },
    });
  }
}
