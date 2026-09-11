import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AdminEventType =
  | 'push_failed'
  | 'email_reminder_failed'
  | 'subscription_failed'
  | 'revenuecat_webhook_error'
  | 'stripe_webhook_error'
  | 'crash_free_rate_snapshot'
  | 'admin_action'
  | 'admin_subscription_changed'
  | 'admin_founder_program_activated'
  | 'admin_studio_edited'
  | 'admin_broadcast';

@Injectable()
export class AdminEventLogService {
  private readonly logger = new Logger(AdminEventLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    type: AdminEventType;
    severity?: 'info' | 'warn' | 'error';
    message?: string;
    metadata?: Prisma.InputJsonValue;
    studioId?: string;
    userId?: string;
  }): Promise<void> {
    try {
      await this.prisma.adminEventLog.create({
        data: {
          type: params.type,
          severity: params.severity ?? 'warn',
          message: params.message,
          metadata: params.metadata,
          studioId: params.studioId,
          userId: params.userId,
        },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`AdminEventLog write failed: ${msg}`);
    }
  }

  async getLatestCrashFreeRate(): Promise<number | null> {
    const row = await this.prisma.adminEventLog.findFirst({
      where: { type: 'crash_free_rate_snapshot' },
      orderBy: { createdAt: 'desc' },
      select: { metadata: true },
    });
    const rate = (row?.metadata as { rate?: number } | null)?.rate;
    return typeof rate === 'number' && Number.isFinite(rate) ? rate : null;
  }

  async logAdminAction(params: {
    action: string;
    adminEmail: string;
    studioId?: string;
    metadata?: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.log({
      type: 'admin_action',
      severity: 'info',
      message: `${params.action} by ${params.adminEmail}`,
      studioId: params.studioId,
      metadata: {
        action: params.action,
        adminEmail: params.adminEmail,
        ...(params.metadata as object),
      },
    });
  }
}
