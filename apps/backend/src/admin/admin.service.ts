import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminEventLogService } from './admin-event-log.service';
import { assertAdmin } from './admin-auth.util';

const ADMIN_TZ = 'Asia/Ho_Chi_Minh';

function startOfTodayInTz(): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ADMIN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return new Date(`${y}-${m}-${d}T00:00:00+07:00`);
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly eventLog: AdminEventLogService,
  ) {}

  async getOverview(authHeader: string | undefined) {
    await assertAdmin(this.authService, authHeader);

    const dayStart = startOfTodayInTz();
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      activeStudios,
      todayBookings,
      todayEnrollments,
      failedNotifications24h,
      failedPayments24h,
      crashFromDb,
    ] = await Promise.all([
      this.prisma.studio.count({ where: { status: 'ACTIVE' } }),
      this.prisma.sessionBooking.count({
        where: {
          createdAt: { gte: dayStart, lt: dayEnd },
          status: { not: BookingStatus.CANCELED },
        },
      }),
      this.prisma.sessionEnrollment.count({
        where: {
          createdAt: { gte: dayStart, lt: dayEnd },
          status: 'ACTIVE',
        },
      }),
      this.prisma.adminEventLog.count({
        where: {
          type: { in: ['push_failed', 'email_reminder_failed'] },
          createdAt: { gte: last24h },
        },
      }),
      this.prisma.adminEventLog.count({
        where: {
          type: {
            in: ['subscription_failed', 'revenuecat_webhook_error'],
          },
          createdAt: { gte: last24h },
        },
      }),
      this.eventLog.getLatestCrashFreeRate(),
    ]);

    const envRate = this.config.get<string>('ADMIN_CRASH_FREE_RATE');
    const parsedEnv = envRate != null ? Number(envRate) : NaN;
    const crashFreeRate7d = Number.isFinite(parsedEnv)
      ? parsedEnv
      : crashFromDb;

    return {
      activeStudios,
      todayBookings: todayBookings + todayEnrollments,
      failedNotifications24h,
      failedPayments24h,
      crashFreeRate7d,
      links: {
        crashlytics:
          this.config.get<string>('CRASHLYTICS_CONSOLE_URL')?.trim() || '',
        sentry: this.config.get<string>('SENTRY_ORG_URL')?.trim() || '',
      },
    };
  }

  async listStudios(
    authHeader: string | undefined,
    page: number,
    limit: number,
    status?: string,
    search?: string,
  ) {
    await assertAdmin(this.authService, authHeader);
    const skip = (page - 1) * limit;
    const where: {
      status?: { equals: 'DRAFT' | 'READY' | 'ACTIVE' };
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        slug?: { contains: string; mode: 'insensitive' };
        User?: { email?: { contains: string; mode: 'insensitive' } };
      }>;
    } = {};

    if (status === 'DRAFT' || status === 'READY' || status === 'ACTIVE') {
      where.status = { equals: status };
    }
    const q = search?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { User: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.studio.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          createdAt: true,
          User: { select: { id: true, email: true, name: true } },
          Subscription: {
            select: { type: true, status: true, currentPeriodEnd: true },
          },
        },
      }),
      this.prisma.studio.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getStudio(authHeader: string | undefined, id: string) {
    await assertAdmin(this.authService, authHeader);
    const studio = await this.prisma.studio.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        address: true,
        phone: true,
        email: true,
        createdAt: true,
        User: { select: { id: true, email: true, name: true, phone: true } },
        Subscription: true,
        _count: {
          select: {
            Booking: true,
            TrainingSession: true,
            StudioClients: true,
          },
        },
      },
    });
    return studio;
  }

  async listSubscriptions(
    authHeader: string | undefined,
    page: number,
    limit: number,
    status?: string,
    type?: string,
  ) {
    await assertAdmin(this.authService, authHeader);
    const skip = (page - 1) * limit;
    const where: {
      status?: { equals: 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'EXPIRED' };
      type?: { equals: 'FREEMIUM' | 'PRO' };
    } = {};
    if (
      status === 'ACTIVE' ||
      status === 'INACTIVE' ||
      status === 'CANCELLED' ||
      status === 'EXPIRED'
    ) {
      where.status = { equals: status };
    }
    if (type === 'FREEMIUM' || type === 'PRO') {
      where.type = { equals: type };
    }

    const [items, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          Studio: {
            select: { id: true, name: true, slug: true, status: true },
          },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async listNotifications(
    authHeader: string | undefined,
    page: number,
    limit: number,
    type?: string,
    from?: string,
    to?: string,
  ) {
    await assertAdmin(this.authService, authHeader);
    const skip = (page - 1) * limit;
    const where: {
      type?: string | { in: string[] };
      createdAt?: { gte?: Date; lte?: Date };
    } = {
      type: type?.trim()
        ? type.trim()
        : { in: ['push_failed', 'email_reminder_failed'] },
    };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      this.prisma.adminEventLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminEventLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async listFeedback(
    authHeader: string | undefined,
    page: number,
    limit: number,
  ) {
    await assertAdmin(this.authService, authHeader);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.appFeedback.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.appFeedback.count(),
    ]);
    return { items, total, page, limit };
  }

  async getSettings(authHeader: string | undefined) {
    await assertAdmin(this.authService, authHeader);
    return {
      nodeEnv: this.config.get<string>('NODE_ENV') ?? 'development',
      ga4Enabled: Boolean(
        this.config.get<string>('GA4_MEASUREMENT_ID') &&
          this.config.get<string>('GA4_API_SECRET'),
      ),
      sentryEnabled: Boolean(this.config.get<string>('SENTRY_DSN')),
      firebasePushEnabled: Boolean(
        this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON') ||
          this.config.get<string>('GOOGLE_APPLICATION_CREDENTIALS'),
      ),
      telegramFeedbackEnabled: Boolean(
        this.config.get<string>('TELEGRAM_BOT_TOKEN') &&
          this.config.get<string>('TELEGRAM_FEEDBACK_CHAT_ID'),
      ),
      links: {
        crashlytics:
          this.config.get<string>('CRASHLYTICS_CONSOLE_URL')?.trim() || '',
        sentry: this.config.get<string>('SENTRY_ORG_URL')?.trim() || '',
      },
      adminAllowedEmailsConfigured: Boolean(
        this.config.get<string>('ADMIN_ALLOWED_EMAILS')?.trim(),
      ),
    };
  }
}
