import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, SessionEnrollmentStatus } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminEventLogService } from './admin-event-log.service';
import { assertAdmin } from './admin-auth.util';
import {
  ActivityTier,
  AdminOwnerActivityService,
} from './admin-owner-activity.service';
import { hasCompleteStudioDetails } from '../lib/training-locations';
import { StudiosService } from '../studios/studios.service';
import { TrainingsService } from '../trainings/trainings.service';
import { TrainersService } from '../trainers/trainers.service';
import { StudioAnalyticsService } from '../fitness/studio-analytics.service';
import { FitnessSessionsService } from '../fitness/fitness-sessions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { renderBroadcastEmail } from '../email/templates/broadcast-email.template';
import { CreateAdminBroadcastDto } from './dto/create-admin-broadcast.dto';
import { UpdateStudioDto } from '../studios/dto/update-studio.dto';
import { CreateServiceDto } from '../trainings/dto/create-service.dto';
import { UpdateServiceDto } from '../trainings/dto/update-service.dto';
import { CreateRecurringTrainingSessionsDto } from '../fitness/dto/create-recurring-training-sessions.dto';
import { PatchAdminSubscriptionDto } from './dto/patch-admin-subscription.dto';
import { CreateAdminTrainerDto } from './dto/create-admin-trainer.dto';
import { PatchAdminFeedbackDto } from './dto/patch-admin-feedback.dto';
import { UpdateAdminTrainerDto } from './dto/update-admin-trainer.dto';

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
    private readonly ownerActivity: AdminOwnerActivityService,
    private readonly studiosService: StudiosService,
    private readonly trainingsService: TrainingsService,
    private readonly trainersService: TrainersService,
    private readonly studioAnalytics: StudioAnalyticsService,
    private readonly fitnessSessions: FitnessSessionsService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
  ) {}

  async verifySession(authHeader: string | undefined) {
    const admin = await assertAdmin(this.authService, authHeader);
    return { authenticated: true as const, email: admin.email };
  }

  async getOverview(authHeader: string | undefined) {
    await assertAdmin(this.authService, authHeader);

    const dayStart = startOfTodayInTz();
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      activeStudios,
      onboardingIncomplete,
      expiringSubscriptions7d,
      todayBookings,
      todayEnrollments,
      failedNotifications24h,
      failedPayments24h,
      crashFromDb,
      activitySummary,
      platformStats,
      openFeedbackCount,
    ] = await Promise.all([
      this.prisma.studio.count({ where: { status: 'ACTIVE' } }),
      this.prisma.studio.count({
        where: {
          OR: [
            { name: '' },
            { address: null },
            { address: '' },
            { Training: { none: {} } },
            { photos: { isEmpty: true } },
          ],
        },
      }),
      this.prisma.subscription.count({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
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
      this.ownerActivity.countTierSummary(),
      this.ownerActivity.getPlatformActivityStats(),
      this.prisma.appFeedback.count({ where: { status: 'open' } }),
    ]);

    const envRate = this.config.get<string>('ADMIN_CRASH_FREE_RATE');
    const parsedEnv = envRate != null ? Number(envRate) : NaN;
    const crashFreeRate7d = Number.isFinite(parsedEnv)
      ? parsedEnv
      : crashFromDb;

    return {
      activeStudios,
      onboardingIncomplete,
      expiringSubscriptions7d,
      publishedStudios: activitySummary.publishedStudios,
      ownersActive7d: activitySummary.ownersActive7d,
      ownersWarming30d: activitySummary.ownersWarming30d,
      ownersSleeping30d: activitySummary.ownersSleeping30d,
      ownersNeverUsed: activitySummary.ownersNeverUsed,
      bookingsLast7d: platformStats.bookingsLast7d,
      newStudiosLast30d: platformStats.newStudiosLast30d,
      openFeedbackCount,
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
    activityTier?: string,
    onboardingIncomplete?: boolean,
  ) {
    await assertAdmin(this.authService, authHeader);
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

    const allMatching = await this.prisma.studio.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        address: true,
        createdAt: true,
        photos: true,
        _count: { select: { Training: true } },
        User: { select: { id: true, email: true, name: true } },
        Subscription: {
          select: {
            id: true,
            type: true,
            status: true,
            currentPeriodEnd: true,
            manualOverride: true,
          },
        },
      },
    });

    const metricsMap = await this.ownerActivity.getMetricsForStudios(
      allMatching.map((s) => ({ id: s.id, status: s.status })),
    );

    const tierFilter = activityTier?.trim() as ActivityTier | undefined;
    const validTiers: ActivityTier[] = [
      'active',
      'warming',
      'sleeping',
      'never_used',
      'draft',
    ];
    const tierFiltered =
      tierFilter && validTiers.includes(tierFilter)
        ? allMatching.filter(
            (s) => metricsMap.get(s.id)?.activityTier === tierFilter,
          )
        : allMatching;
    const filtered = onboardingIncomplete
      ? tierFiltered.filter(
          (studio) =>
            !hasCompleteStudioDetails(studio) ||
            studio._count.Training === 0 ||
            studio.photos.length === 0,
        )
      : tierFiltered;

    const total = filtered.length;
    const skip = (page - 1) * limit;
    const pageItems = filtered.slice(skip, skip + limit);

    const items = pageItems.map((s) => {
      const m = metricsMap.get(s.id);
      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        status: s.status,
        createdAt: s.createdAt,
        User: s.User,
        Subscription: s.Subscription,
        onboardingGaps: [
          ...(!hasCompleteStudioDetails(s) ? ['hasStudioDetails'] : []),
          ...(s._count.Training === 0 ? ['hasTraining'] : []),
          ...(s.photos.length === 0 ? ['hasPhoto'] : []),
        ],
        lastActivityAt: m?.lastActivityAt ?? null,
        activityTier: m?.activityTier ?? 'draft',
        bookingsLast30d: m?.bookingsLast30d ?? 0,
        sessionsLast30d: m?.sessionsLast30d ?? 0,
        clientsCount: m?.clientsCount ?? 0,
      };
    });

    return { items, total, page, limit };
  }

  async listOwners(
    authHeader: string | undefined,
    page: number,
    limit: number,
    search?: string,
    onboarding?: 'complete' | 'incomplete',
  ) {
    await assertAdmin(this.authService, authHeader);
    const q = search?.trim();
    const where = {
      role: 'OWNER' as const,
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' as const } },
              { name: { contains: q, mode: 'insensitive' as const } },
              { phone: { contains: q, mode: 'insensitive' as const } },
              {
                Studio: {
                  some: { name: { contains: q, mode: 'insensitive' as const } },
                },
              },
            ],
          }
        : {}),
    };

    const owners = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
        Studio: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            address: true,
            photos: true,
            createdAt: true,
            _count: { select: { Training: true } },
          },
        },
      },
    });

    const mapped = owners.flatMap((owner) => {
      if (owner.Studio.length === 0) {
        return [
          {
            id: owner.id,
            ownerId: owner.id,
            ownerEmail: owner.email,
            ownerName: owner.name,
            ownerPhone: owner.phone,
            ownerCreatedAt: owner.createdAt,
            studioId: null as string | null,
            studioName: null as string | null,
            studioSlug: null as string | null,
            studioStatus: null as string | null,
            studioCreatedAt: null as Date | null,
            onboardingGaps: ['noStudio'],
            onboardingComplete: false,
          },
        ];
      }

      return owner.Studio.map((s) => {
        const onboardingGaps = [
          ...(!hasCompleteStudioDetails(s) ? ['hasStudioDetails'] : []),
          ...(s._count.Training === 0 ? ['hasTraining'] : []),
          ...(s.photos.length === 0 ? ['hasPhoto'] : []),
        ];
        return {
          id: `${owner.id}:${s.id}`,
          ownerId: owner.id,
          ownerEmail: owner.email,
          ownerName: owner.name,
          ownerPhone: owner.phone,
          ownerCreatedAt: owner.createdAt,
          studioId: s.id as string | null,
          studioName: s.name as string | null,
          studioSlug: s.slug as string | null,
          studioStatus: s.status as string | null,
          studioCreatedAt: s.createdAt as Date | null,
          onboardingGaps,
          onboardingComplete: onboardingGaps.length === 0,
        };
      });
    });

    const filtered =
      onboarding === 'complete'
        ? mapped.filter((r) => r.onboardingComplete)
        : onboarding === 'incomplete'
          ? mapped.filter((r) => !r.onboardingComplete)
          : mapped;

    const total = filtered.length;
    const items = filtered.slice((page - 1) * limit, page * limit);
    return { items, total, page, limit };
  }

  async listDirectoryClients(
    authHeader: string | undefined,
    page: number,
    limit: number,
    search?: string,
    activityTier?: string,
  ) {
    await assertAdmin(this.authService, authHeader);
    const q = search?.trim();
    const where = {
      AND: [
        { role: { not: 'ADMIN' as const } },
        {
          OR: [
            { role: 'CLIENT' as const },
            { StudioClients: { some: {} } },
            { Booking: { some: {} } },
            { SessionEnrollment: { some: {} } },
          ],
        },
      ],
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
              { phone: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const clients = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isGuest: true,
        createdAt: true,
      },
    });

    const userIds = clients.map((c) => c.id);
    type ClientAgg = {
      bookingsCount: number;
      studioIds: Set<string>;
      lastVisitAt: Date | null;
    };
    const aggregates = new Map<string, ClientAgg>();
    const aggFor = (userId: string): ClientAgg => {
      let agg = aggregates.get(userId);
      if (!agg) {
        agg = { bookingsCount: 0, studioIds: new Set(), lastVisitAt: null };
        aggregates.set(userId, agg);
      }
      return agg;
    };

    if (userIds.length > 0) {
      const [bookingRows, enrollmentRows, rosterRows] = await Promise.all([
        this.prisma.sessionBooking.findMany({
          where: {
            userId: { in: userIds },
            status: { not: BookingStatus.CANCELED },
          },
          select: { userId: true, studioId: true, startsAt: true },
        }),
        this.prisma.sessionEnrollment.findMany({
          where: {
            userId: { in: userIds },
            status: { not: SessionEnrollmentStatus.CANCELLED },
          },
          select: {
            userId: true,
            TrainingSession: { select: { studioId: true, startsAt: true } },
          },
        }),
        this.prisma.studioClient.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, studioId: true },
        }),
      ]);

      for (const b of bookingRows) {
        const agg = aggFor(b.userId);
        agg.bookingsCount += 1;
        agg.studioIds.add(b.studioId);
        if (!agg.lastVisitAt || b.startsAt > agg.lastVisitAt) {
          agg.lastVisitAt = b.startsAt;
        }
      }
      for (const e of enrollmentRows) {
        const agg = aggFor(e.userId);
        agg.bookingsCount += 1;
        agg.studioIds.add(e.TrainingSession.studioId);
        const at = e.TrainingSession.startsAt;
        if (!agg.lastVisitAt || at > agg.lastVisitAt) {
          agg.lastVisitAt = at;
        }
      }
      for (const r of rosterRows) {
        aggFor(r.userId).studioIds.add(r.studioId);
      }
    }

    const MS_7D = 7 * 24 * 60 * 60 * 1000;
    const MS_30D = 30 * 24 * 60 * 60 * 1000;
    const computeTier = (
      lastVisitAt: Date | null,
    ): 'active' | 'warming' | 'sleeping' | 'never' => {
      if (!lastVisitAt) return 'never';
      const age = Date.now() - lastVisitAt.getTime();
      if (age <= MS_7D) return 'active';
      if (age <= MS_30D) return 'warming';
      return 'sleeping';
    };

    const mapped = clients.map((c) => {
      const agg = aggregates.get(c.id);
      const lastVisitAt = agg?.lastVisitAt ?? null;
      return {
        id: c.id,
        userId: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        isGuest: c.isGuest,
        createdAt: c.createdAt,
        bookingsCount: agg?.bookingsCount ?? 0,
        studiosCount: agg?.studioIds.size ?? 0,
        lastVisitAt,
        activityTier: computeTier(lastVisitAt),
      };
    });

    const validTiers = ['active', 'warming', 'sleeping', 'never'] as const;
    const tierFilter = activityTier?.trim();
    const filtered =
      tierFilter && (validTiers as readonly string[]).includes(tierFilter)
        ? mapped.filter((r) => r.activityTier === tierFilter)
        : mapped;

    filtered.sort((a, b) => {
      const aTime = a.lastVisitAt?.getTime() ?? 0;
      const bTime = b.lastVisitAt?.getTime() ?? 0;
      if (bTime !== aTime) return bTime - aTime;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const total = filtered.length;
    const items = filtered.slice((page - 1) * limit, page * limit);
    return { items, total, page, limit };
  }

  async listDirectoryTrainers(
    authHeader: string | undefined,
    page: number,
    limit: number,
    search?: string,
  ) {
    await assertAdmin(this.authService, authHeader);
    const q = search?.trim();
    const where = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
              { phone: { contains: q, mode: 'insensitive' as const } },
              {
                Studio: { name: { contains: q, mode: 'insensitive' as const } },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.trainer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          accessLevel: true,
          userId: true,
          Studio: { select: { id: true, name: true } },
        },
      }),
      this.prisma.trainer.count({ where }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      accessLevel: r.accessLevel,
      userId: r.userId,
      hasLinkedUser: Boolean(r.userId),
      studioId: r.Studio.id,
      studioName: r.Studio.name,
    }));

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
        description: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        instagram: true,
        logoUrl: true,
        photos: true,
        photoGallery: true,
        workingHours: true,
        reminderSettings: true,
        createdAt: true,
        User: { select: { id: true, email: true, name: true, phone: true } },
        Subscription: true,
        _count: {
          select: {
            Booking: true,
            TrainingSession: true,
            StudioClients: true,
            Training: true,
            Trainer: true,
          },
        },
      },
    });
    if (!studio) return null;

    const metricsMap = await this.ownerActivity.getMetricsForStudios([
      { id: studio.id, status: studio.status },
    ]);
    const activity = metricsMap.get(studio.id);
    const checklist = await this.studiosService.getStudioOnboardingChecklist(
      studio.id,
    );

    return {
      ...studio,
      lastActivityAt: activity?.lastActivityAt ?? null,
      activityTier: activity?.activityTier ?? 'draft',
      bookingsLast30d: activity?.bookingsLast30d ?? 0,
      sessionsLast30d: activity?.sessionsLast30d ?? 0,
      clientsCount: activity?.clientsCount ?? 0,
      onboardingChecklist: checklist,
    };
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
      type?: { equals: 'SOLO' | 'STUDIO' | 'ENTERPRISE' };
    } = {};
    if (
      status === 'ACTIVE' ||
      status === 'INACTIVE' ||
      status === 'CANCELLED' ||
      status === 'EXPIRED'
    ) {
      where.status = { equals: status };
    }
    if (type === 'SOLO' || type === 'STUDIO' || type === 'ENTERPRISE') {
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
    } = {};
    const trimmedType = type?.trim();
    if (trimmedType === 'all') {
      where.type = {
        in: [
          'push_failed',
          'email_reminder_failed',
          'subscription_failed',
          'revenuecat_webhook_error',
          'admin_action',
          'admin_subscription_changed',
        ],
      };
    } else if (trimmedType) {
      where.type = trimmedType;
    } else {
      where.type = { in: ['push_failed', 'email_reminder_failed'] };
    }
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
    status?: string,
  ) {
    await assertAdmin(this.authService, authHeader);
    const skip = (page - 1) * limit;
    const where: { status?: string } = {};
    if (
      status === 'open' ||
      status === 'in_progress' ||
      status === 'resolved'
    ) {
      where.status = status;
    }
    const [items, total] = await Promise.all([
      this.prisma.appFeedback.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.appFeedback.count({ where }),
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

  async getStudioActivity(authHeader: string | undefined, studioId: string) {
    await assertAdmin(this.authService, authHeader);
    await this.assertStudioExists(studioId);
    const timeline =
      await this.ownerActivity.getStudioActivityTimeline(studioId);
    const checklist =
      await this.studiosService.getStudioOnboardingChecklist(studioId);
    return { timeline, onboardingGaps: checklist.missingRequiredSteps };
  }

  async patchFeedback(
    authHeader: string | undefined,
    feedbackId: string,
    dto: PatchAdminFeedbackDto,
  ) {
    const admin = await assertAdmin(this.authService, authHeader);
    const existing = await this.prisma.appFeedback.findUnique({
      where: { id: feedbackId },
    });
    if (!existing) {
      throw new NotFoundException('Feedback not found');
    }

    const data: {
      status?: string;
      adminNote?: string | null;
      resolvedAt?: Date | null;
    } = {};
    if (dto.status) {
      data.status = dto.status;
      data.resolvedAt = dto.status === 'resolved' ? new Date() : null;
    }
    if (dto.adminNote !== undefined) {
      data.adminNote = dto.adminNote.trim() || null;
    }

    const updated = await this.prisma.appFeedback.update({
      where: { id: feedbackId },
      data,
    });

    await this.eventLog.logAdminAction({
      action: 'feedback_updated',
      adminEmail: admin.email,
      metadata: { feedbackId, status: dto.status },
    });

    return updated;
  }

  async getStudioAnalytics(
    authHeader: string | undefined,
    studioId: string,
    from?: string,
    to?: string,
  ) {
    await assertAdmin(this.authService, authHeader);
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: { id: true },
    });
    if (!studio) {
      throw new NotFoundException('Studio not found');
    }
    return this.studioAnalytics.getStudioAnalyticsByStudioId(
      studioId,
      from,
      to,
    );
  }

  async patchSubscription(
    authHeader: string | undefined,
    subscriptionId: string,
    dto: PatchAdminSubscriptionDto,
  ) {
    const admin = await assertAdmin(this.authService, authHeader);
    const existing = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!existing) {
      throw new NotFoundException('Subscription not found');
    }

    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.type) data.type = dto.type;
    if (dto.status) data.status = dto.status;
    if (dto.currentPeriodEnd !== undefined) {
      data.currentPeriodEnd = dto.currentPeriodEnd
        ? new Date(dto.currentPeriodEnd)
        : null;
    }
    if (dto.manualOverride !== undefined) {
      data.manualOverride = dto.manualOverride;
      if (dto.manualOverride) {
        data.manualOverrideAt = new Date();
        data.manualOverrideBy = admin.email;
      } else {
        data.manualOverrideAt = null;
        data.manualOverrideBy = null;
      }
    } else if (
      dto.type !== undefined ||
      dto.status !== undefined ||
      dto.currentPeriodEnd !== undefined
    ) {
      data.manualOverride = true;
      data.manualOverrideAt = new Date();
      data.manualOverrideBy = admin.email;
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data,
      include: {
        Studio: { select: { id: true, name: true } },
      },
    });

    await this.eventLog.log({
      type: 'admin_subscription_changed',
      severity: 'info',
      message: `Subscription updated for ${updated.Studio.name}`,
      studioId: updated.studioId,
      metadata: {
        adminEmail: admin.email,
        subscriptionId,
        changes: { ...dto },
      },
    });

    // Notify the studio owner when the admin grants or extends a paid plan
    // (not on revoke-to-SOLO or plain status edits).
    const paidTiers = ['STUDIO', 'ENTERPRISE'];
    const prevEnd = existing.currentPeriodEnd?.getTime() ?? 0;
    const nextEnd = updated.currentPeriodEnd?.getTime() ?? 0;
    const extended = nextEnd > prevEnd;
    const upgraded =
      paidTiers.includes(updated.type) && !paidTiers.includes(existing.type);
    if (
      updated.status === 'ACTIVE' &&
      updated.type !== 'SOLO' &&
      (extended || upgraded)
    ) {
      await this.notifications.sendSubscriptionUpdatePush(updated.studioId, {
        plan: updated.type,
        currentPeriodEnd: updated.currentPeriodEnd,
      });
    }

    return updated;
  }

  async activateFounderProgram(
    authHeader: string | undefined,
    subscriptionId: string,
  ) {
    const admin = await assertAdmin(this.authService, authHeader);
    const existing = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!existing) {
      throw new NotFoundException('Subscription not found');
    }

    const FOUNDER_DAYS = 90;
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + FOUNDER_DAYS);
    periodEnd.setHours(23, 59, 59, 999);

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        type: 'STUDIO',
        status: 'ACTIVE',
        currentPeriodEnd: periodEnd,
        manualOverride: true,
        manualOverrideAt: now,
        manualOverrideBy: admin.email,
        updatedAt: now,
      },
      include: {
        Studio: { select: { id: true, name: true } },
      },
    });

    await this.eventLog.log({
      type: 'admin_founder_program_activated',
      severity: 'info',
      message: `Founder Program activated for ${updated.Studio.name}`,
      studioId: updated.studioId,
      metadata: {
        adminEmail: admin.email,
        subscriptionId,
        founderDays: FOUNDER_DAYS,
        currentPeriodEnd: periodEnd.toISOString(),
      },
    });

    await this.notifications.sendSubscriptionUpdatePush(updated.studioId, {
      plan: 'STUDIO',
      currentPeriodEnd: periodEnd,
      founder: true,
      founderDays: FOUNDER_DAYS,
    });

    return updated;
  }

  async patchStudioProfile(
    authHeader: string | undefined,
    studioId: string,
    dto: UpdateStudioDto,
  ) {
    const admin = await assertAdmin(this.authService, authHeader);
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: { id: true, ownerId: true, name: true },
    });
    if (!studio) {
      throw new NotFoundException('Studio not found');
    }

    const updated = await this.studiosService.updateCurrentUserStudio(
      dto,
      studio.ownerId,
    );

    await this.eventLog.logAdminAction({
      action: 'studio_profile_updated',
      adminEmail: admin.email,
      studioId,
      metadata: { fields: Object.keys(dto) },
    });

    return updated;
  }

  async listStudioTrainings(authHeader: string | undefined, studioId: string) {
    await assertAdmin(this.authService, authHeader);
    await this.assertStudioExists(studioId);
    return this.prisma.training.findMany({
      where: { studioId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        duration: true,
        price: true,
        trainingCategoryId: true,
        description: true,
      },
    });
  }

  async createStudioTraining(
    authHeader: string | undefined,
    studioId: string,
    dto: CreateServiceDto,
  ) {
    const admin = await assertAdmin(this.authService, authHeader);
    await this.assertStudioExists(studioId);

    const created = await this.trainingsService.createTraining({
      ...dto,
      studioId,
    });

    await this.eventLog.logAdminAction({
      action: 'training_created',
      adminEmail: admin.email,
      studioId,
      metadata: { trainingId: created?.id, name: dto.name },
    });

    return created;
  }

  async updateStudioTraining(
    authHeader: string | undefined,
    studioId: string,
    trainingId: string,
    dto: UpdateServiceDto,
  ) {
    const admin = await assertAdmin(this.authService, authHeader);
    await this.assertStudioTraining(studioId, trainingId);

    const updated = await this.trainingsService.updateTraining(trainingId, dto);

    await this.eventLog.logAdminAction({
      action: 'training_updated',
      adminEmail: admin.email,
      studioId,
      metadata: { trainingId },
    });

    return updated;
  }

  async listStudioTrainers(authHeader: string | undefined, studioId: string) {
    await assertAdmin(this.authService, authHeader);
    await this.assertStudioExists(studioId);
    return this.prisma.trainer.findMany({
      where: { studioId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        accessLevel: true,
      },
    });
  }

  async listStudioBookings(
    authHeader: string | undefined,
    studioId: string,
    sort?: string,
  ) {
    await assertAdmin(this.authService, authHeader);
    await this.assertStudioExists(studioId);

    const orderBy = (() => {
      switch (sort) {
        case 'startsAt_asc':
          return { startsAt: 'asc' as const };
        case 'createdAt_desc':
          return { createdAt: 'desc' as const };
        case 'createdAt_asc':
          return { createdAt: 'asc' as const };
        case 'status':
          return { status: 'asc' as const };
        case 'startsAt_desc':
        default:
          return { startsAt: 'desc' as const };
      }
    })();

    return this.prisma.sessionBooking.findMany({
      where: { studioId },
      orderBy,
      take: 200,
      select: {
        id: true,
        status: true,
        startsAt: true,
        createdAt: true,
        User: { select: { name: true, email: true } },
        Training: { select: { name: true } },
        Trainer: { select: { name: true } },
      },
    });
  }

  async createStudioTrainer(
    authHeader: string | undefined,
    studioId: string,
    dto: CreateAdminTrainerDto,
  ) {
    const admin = await assertAdmin(this.authService, authHeader);
    await this.assertStudioExists(studioId);

    const created = await this.trainersService.createTrainer({
      ...dto,
      studioId,
    });

    await this.eventLog.logAdminAction({
      action: 'trainer_created',
      adminEmail: admin.email,
      studioId,
      metadata: { trainerId: created?.id, name: dto.name },
    });

    return created;
  }

  async updateStudioTrainer(
    authHeader: string | undefined,
    studioId: string,
    trainerId: string,
    dto: UpdateAdminTrainerDto,
  ) {
    const admin = await assertAdmin(this.authService, authHeader);
    const trainerStudioId =
      await this.trainersService.findTrainerStudioId(trainerId);
    if (trainerStudioId !== studioId) {
      throw new NotFoundException('Trainer not found');
    }

    const updated = await this.trainersService.updateTrainer(trainerId, dto);

    await this.eventLog.logAdminAction({
      action: 'trainer_updated',
      adminEmail: admin.email,
      studioId,
      metadata: { trainerId },
    });

    return updated;
  }

  async createStudioRecurringSessions(
    authHeader: string | undefined,
    studioId: string,
    dto: CreateRecurringTrainingSessionsDto,
  ) {
    const admin = await assertAdmin(this.authService, authHeader);
    await this.assertStudioExists(studioId);

    const result = await this.fitnessSessions.createRecurringSessionsForStudio({
      ...dto,
      studioId,
    });

    await this.eventLog.logAdminAction({
      action: 'recurring_sessions_created',
      adminEmail: admin.email,
      studioId,
      metadata: {
        trainingId: dto.trainingId,
        createdCount:
          (result as { data?: { createdCount?: number } })?.data
            ?.createdCount ?? 0,
      },
    });

    return result;
  }

  async listStudioClients(
    authHeader: string | undefined,
    studioId: string,
    page: number,
    limit: number,
    search?: string,
  ) {
    await assertAdmin(this.authService, authHeader);
    await this.assertStudioExists(studioId);

    const q = search?.trim();
    const where = {
      studioId,
      ...(q
        ? {
            User: {
              OR: [
                { name: { contains: q, mode: 'insensitive' as const } },
                { email: { contains: q, mode: 'insensitive' as const } },
                { phone: { contains: q, mode: 'insensitive' as const } },
              ],
            },
          }
        : {}),
    };

    const [rosterRows, total] = await Promise.all([
      this.prisma.studioClient.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          source: true,
          notes: true,
          createdAt: true,
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              isGuest: true,
            },
          },
        },
      }),
      this.prisma.studioClient.count({ where }),
    ]);

    const userIds = rosterRows.map((r) => r.userId);
    const [bookings, enrollments] = await Promise.all([
      this.prisma.sessionBooking.findMany({
        where: { studioId, userId: { in: userIds } },
        select: { userId: true, status: true, startsAt: true },
      }),
      this.prisma.sessionEnrollment.findMany({
        where: {
          userId: { in: userIds },
          TrainingSession: { studioId },
        },
        select: {
          userId: true,
          status: true,
          TrainingSession: { select: { startsAt: true } },
        },
      }),
    ]);

    type ClientAgg = {
      visitsCount: number;
      noShowCount: number;
      lastVisitAt: Date | null;
      lastNoShowAt: Date | null;
    };
    const aggregates = new Map<string, ClientAgg>();
    const aggFor = (userId: string): ClientAgg => {
      let agg = aggregates.get(userId);
      if (!agg) {
        agg = {
          visitsCount: 0,
          noShowCount: 0,
          lastVisitAt: null,
          lastNoShowAt: null,
        };
        aggregates.set(userId, agg);
      }
      return agg;
    };

    for (const b of bookings) {
      const agg = aggFor(b.userId);
      agg.visitsCount += 1;
      if (!agg.lastVisitAt || b.startsAt > agg.lastVisitAt) {
        agg.lastVisitAt = b.startsAt;
      }
      if (b.status === BookingStatus.NOSHOW) {
        agg.noShowCount += 1;
        if (!agg.lastNoShowAt || b.startsAt > agg.lastNoShowAt) {
          agg.lastNoShowAt = b.startsAt;
        }
      }
    }
    for (const e of enrollments) {
      if (e.status === SessionEnrollmentStatus.CANCELLED) continue;
      const agg = aggFor(e.userId);
      const at = e.TrainingSession.startsAt;
      agg.visitsCount += 1;
      if (!agg.lastVisitAt || at > agg.lastVisitAt) {
        agg.lastVisitAt = at;
      }
      if (e.status === SessionEnrollmentStatus.NO_SHOW) {
        agg.noShowCount += 1;
        if (!agg.lastNoShowAt || at > agg.lastNoShowAt) {
          agg.lastNoShowAt = at;
        }
      }
    }

    const items = rosterRows.map((r) => {
      const agg = aggregates.get(r.userId);
      return {
        id: r.id,
        userId: r.userId,
        source: r.source,
        notes: r.notes,
        rosterCreatedAt: r.createdAt,
        name: r.User.name,
        email: r.User.email,
        phone: r.User.phone,
        isGuest: r.User.isGuest,
        visitsCount: agg?.visitsCount ?? 0,
        noShowCount: agg?.noShowCount ?? 0,
        lastVisitAt: agg?.lastVisitAt ?? null,
        lastNoShowAt: agg?.lastNoShowAt ?? null,
      };
    });

    return { items, total, page, limit };
  }

  async listStudioVisits(
    authHeader: string | undefined,
    studioId: string,
    page: number,
    limit: number,
    status?: string,
  ) {
    await assertAdmin(this.authService, authHeader);
    await this.assertStudioExists(studioId);

    // Recent window merged in memory; admin support rarely needs deep history.
    const FETCH_WINDOW = 500;
    const [bookings, enrollments] = await Promise.all([
      this.prisma.sessionBooking.findMany({
        where: { studioId },
        orderBy: { startsAt: 'desc' },
        take: FETCH_WINDOW,
        select: {
          id: true,
          status: true,
          startsAt: true,
          User: { select: { id: true, name: true, email: true } },
          Training: { select: { name: true } },
        },
      }),
      this.prisma.sessionEnrollment.findMany({
        where: { TrainingSession: { studioId } },
        orderBy: { TrainingSession: { startsAt: 'desc' } },
        take: FETCH_WINDOW,
        select: {
          id: true,
          status: true,
          User: { select: { id: true, name: true, email: true } },
          TrainingSession: {
            select: {
              startsAt: true,
              Training: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    type VisitRow = {
      id: string;
      kind: 'booking' | 'enrollment';
      status: string;
      startsAt: Date;
      clientId: string;
      clientName: string | null;
      clientEmail: string;
      trainingName: string;
    };

    const merged: VisitRow[] = [
      ...bookings.map((b) => ({
        id: b.id,
        kind: 'booking' as const,
        status: b.status as string,
        startsAt: b.startsAt,
        clientId: b.User.id,
        clientName: b.User.name,
        clientEmail: b.User.email,
        trainingName: b.Training.name,
      })),
      ...enrollments.map((e) => ({
        id: e.id,
        kind: 'enrollment' as const,
        status: e.status as string,
        startsAt: e.TrainingSession.startsAt,
        clientId: e.User.id,
        clientName: e.User.name,
        clientEmail: e.User.email,
        trainingName: e.TrainingSession.Training.name,
      })),
    ].sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

    const statusFilter = status?.trim().toUpperCase();
    const filtered = statusFilter
      ? merged.filter((v) =>
          statusFilter === 'NO_SHOW'
            ? v.status === 'NOSHOW' || v.status === 'NO_SHOW'
            : v.status === statusFilter,
        )
      : merged;

    const total = filtered.length;
    const items = filtered.slice((page - 1) * limit, page * limit);
    return { items, total, page, limit };
  }

  async listNoShowClients(
    authHeader: string | undefined,
    page: number,
    limit: number,
    minNoShows = 3,
    days = 90,
  ) {
    await assertAdmin(this.authService, authHeader);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [bookingRows, enrollmentRows] = await Promise.all([
      this.prisma.sessionBooking.findMany({
        where: { status: BookingStatus.NOSHOW, startsAt: { gte: since } },
        select: { userId: true, studioId: true, startsAt: true },
      }),
      this.prisma.sessionEnrollment.findMany({
        where: {
          status: SessionEnrollmentStatus.NO_SHOW,
          TrainingSession: { startsAt: { gte: since } },
        },
        select: {
          userId: true,
          TrainingSession: { select: { studioId: true, startsAt: true } },
        },
      }),
    ]);

    type NoShowAgg = {
      userId: string;
      studioId: string;
      noShowCount: number;
      lastNoShowAt: Date;
    };
    const byKey = new Map<string, NoShowAgg>();
    const record = (userId: string, studioId: string, at: Date) => {
      const key = `${studioId}:${userId}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.noShowCount += 1;
        if (at > existing.lastNoShowAt) existing.lastNoShowAt = at;
      } else {
        byKey.set(key, { userId, studioId, noShowCount: 1, lastNoShowAt: at });
      }
    };
    for (const b of bookingRows) record(b.userId, b.studioId, b.startsAt);
    for (const e of enrollmentRows) {
      record(e.userId, e.TrainingSession.studioId, e.TrainingSession.startsAt);
    }

    const ranked = [...byKey.values()]
      .filter((r) => r.noShowCount >= minNoShows)
      .sort(
        (a, b) =>
          b.noShowCount - a.noShowCount ||
          b.lastNoShowAt.getTime() - a.lastNoShowAt.getTime(),
      );

    const total = ranked.length;
    const pageRows = ranked.slice((page - 1) * limit, page * limit);

    const userIds = [...new Set(pageRows.map((r) => r.userId))];
    const studioIds = [...new Set(pageRows.map((r) => r.studioId))];
    const [users, studios] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, phone: true },
      }),
      this.prisma.studio.findMany({
        where: { id: { in: studioIds } },
        select: { id: true, name: true },
      }),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));
    const studioMap = new Map(studios.map((s) => [s.id, s]));

    const items = pageRows.map((r) => {
      const user = userMap.get(r.userId);
      const studio = studioMap.get(r.studioId);
      return {
        id: `${r.studioId}:${r.userId}`,
        userId: r.userId,
        studioId: r.studioId,
        studioName: studio?.name ?? '—',
        clientName: user?.name ?? null,
        clientEmail: user?.email ?? '—',
        clientPhone: user?.phone ?? null,
        noShowCount: r.noShowCount,
        lastNoShowAt: r.lastNoShowAt,
      };
    });

    return { items, total, page, limit, minNoShows, days };
  }

  async listPaymentEvents(
    authHeader: string | undefined,
    page: number,
    limit: number,
    from?: string,
    to?: string,
  ) {
    await assertAdmin(this.authService, authHeader);
    const where: {
      type: { in: string[] };
      createdAt?: { gte?: Date; lte?: Date };
    } = {
      type: { in: ['subscription_failed', 'revenuecat_webhook_error'] },
    };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [rows, total] = await Promise.all([
      this.prisma.adminEventLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminEventLog.count({ where }),
    ]);

    const studioIds = [
      ...new Set(rows.map((r) => r.studioId).filter((v): v is string => !!v)),
    ];
    const userIds = [
      ...new Set(rows.map((r) => r.userId).filter((v): v is string => !!v)),
    ];
    const [studios, users, ownedStudios] = await Promise.all([
      this.prisma.studio.findMany({
        where: { id: { in: studioIds } },
        select: {
          id: true,
          name: true,
          User: { select: { email: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true },
      }),
      // Payment events often carry only userId; resolve their studio too.
      this.prisma.studio.findMany({
        where: { ownerId: { in: userIds } },
        select: { id: true, name: true, ownerId: true },
      }),
    ]);
    const studioMap = new Map(studios.map((s) => [s.id, s]));
    const userMap = new Map(users.map((u) => [u.id, u]));
    const ownerStudioMap = new Map(ownedStudios.map((s) => [s.ownerId, s]));

    const items = rows.map((r) => {
      const studio = r.studioId
        ? studioMap.get(r.studioId)
        : r.userId
          ? ownerStudioMap.get(r.userId)
          : undefined;
      const user = r.userId ? userMap.get(r.userId) : undefined;
      return {
        id: r.id,
        type: r.type,
        severity: r.severity,
        message: r.message,
        metadata: r.metadata,
        createdAt: r.createdAt,
        studioId: studio?.id ?? r.studioId ?? null,
        studioName: studio?.name ?? null,
        ownerEmail:
          user?.email ??
          (studio && 'User' in studio ? studio.User.email : null),
      };
    });

    return { items, total, page, limit };
  }

  async getStudioPaymentEvents(
    authHeader: string | undefined,
    studioId: string,
    limit = 10,
  ) {
    await assertAdmin(this.authService, authHeader);
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: { id: true, ownerId: true },
    });
    if (!studio) {
      throw new NotFoundException('Studio not found');
    }

    return this.prisma.adminEventLog.findMany({
      where: {
        type: {
          in: [
            'subscription_failed',
            'revenuecat_webhook_error',
            'admin_subscription_changed',
          ],
        },
        OR: [{ studioId }, { userId: studio.ownerId }],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async resolveBroadcastAudience(dto: CreateAdminBroadcastDto) {
    const studios = await this.prisma.studio.findMany({
      where:
        dto.audience === 'studio_ids'
          ? { id: { in: dto.studioIds ?? [] } }
          : {},
      select: {
        id: true,
        name: true,
        status: true,
        photos: true,
        ownerId: true,
        _count: { select: { Training: true } },
        User: { select: { id: true, email: true, name: true } },
      },
    });

    let selected = studios;
    if (dto.audience === 'activity_tier') {
      const metrics = await this.ownerActivity.getMetricsForStudios(
        studios.map((s) => ({ id: s.id, status: s.status })),
      );
      selected = studios.filter(
        (s) => metrics.get(s.id)?.activityTier === dto.activityTier,
      );
    } else if (dto.audience === 'onboarding_incomplete') {
      selected = studios.filter(
        (s) => s._count.Training === 0 || s.photos.length === 0,
      );
    }

    const ownerMap = new Map<
      string,
      { userId: string; email: string; name: string | null }
    >();
    for (const s of selected) {
      if (!ownerMap.has(s.ownerId)) {
        ownerMap.set(s.ownerId, {
          userId: s.ownerId,
          email: s.User.email,
          name: s.User.name,
        });
      }
    }

    return {
      studioCount: selected.length,
      owners: [...ownerMap.values()],
    };
  }

  async sendBroadcast(
    authHeader: string | undefined,
    dto: CreateAdminBroadcastDto,
  ) {
    const admin = await assertAdmin(this.authService, authHeader);
    const { studioCount, owners } = await this.resolveBroadcastAudience(dto);

    if (dto.dryRun) {
      return {
        dryRun: true as const,
        studioCount,
        ownerCount: owners.length,
      };
    }
    if (owners.length === 0) {
      throw new BadRequestException('Broadcast audience is empty');
    }

    const wantPush = dto.channels === 'push' || dto.channels === 'both';
    const wantEmail = dto.channels === 'email' || dto.channels === 'both';

    let pushTokens = 0;
    let emailsSent = 0;
    let emailsFailed = 0;

    if (wantPush) {
      const tokenLists = await Promise.all(
        owners.map((o) => this.notifications.getPushTokensByUserId(o.userId)),
      );
      const tokens = tokenLists.flat();
      pushTokens = tokens.length;
      if (tokens.length > 0) {
        await this.notifications.sendPushNotification(
          tokens,
          dto.title,
          dto.body,
          { type: 'ADMIN_BROADCAST' },
        );
      }
    }

    if (wantEmail) {
      // The title is used only as the email subject below — not repeated in the
      // body — and the template adds the signature + logo footer.
      const html = renderBroadcastEmail({ body: dto.body });

      const CHUNK = 10;
      for (let i = 0; i < owners.length; i += CHUNK) {
        const chunk = owners.slice(i, i + CHUNK);
        const results = await Promise.allSettled(
          chunk.map((o) =>
            this.email.sendEmail({
              to: o.email,
              subject: dto.title,
              html,
              text: dto.body,
            }),
          ),
        );
        for (const r of results) {
          if (r.status === 'fulfilled') emailsSent += 1;
          else emailsFailed += 1;
        }
      }
    }

    await this.eventLog.log({
      type: 'admin_broadcast',
      severity: 'info',
      message: `Broadcast "${dto.title}" by ${admin.email}`,
      metadata: {
        adminEmail: admin.email,
        channels: dto.channels,
        audience: dto.audience,
        activityTier: dto.activityTier ?? null,
        studioIds: dto.studioIds ?? null,
        studioCount,
        ownerCount: owners.length,
        pushTokens,
        emailsSent,
        emailsFailed,
      },
    });

    return {
      dryRun: false as const,
      studioCount,
      ownerCount: owners.length,
      pushTokens,
      emailsSent,
      emailsFailed,
    };
  }

  private async assertStudioExists(studioId: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: { id: true },
    });
    if (!studio) {
      throw new NotFoundException('Studio not found');
    }
  }

  private async assertStudioTraining(studioId: string, trainingId: string) {
    const training = await this.prisma.training.findFirst({
      where: { id: trainingId, studioId },
      select: { id: true },
    });
    if (!training) {
      throw new NotFoundException('Training not found');
    }
  }
}
