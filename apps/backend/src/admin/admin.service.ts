import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminEventLogService } from './admin-event-log.service';
import { assertAdmin } from './admin-auth.util';
import {
  ActivityTier,
  AdminOwnerActivityService,
} from './admin-owner-activity.service';
import { StudiosService } from '../studios/studios.service';
import { TrainingsService } from '../trainings/trainings.service';
import { TrainersService } from '../trainers/trainers.service';
import { StudioAnalyticsService } from '../fitness/studio-analytics.service';
import { FitnessSessionsService } from '../fitness/fitness-sessions.service';
import { NotificationsService } from '../notifications/notifications.service';
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
      activitySummary,
      platformStats,
      openFeedbackCount,
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
        createdAt: true,
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
    const filtered =
      tierFilter && validTiers.includes(tierFilter)
        ? allMatching.filter(
            (s) => metricsMap.get(s.id)?.activityTier === tierFilter,
          )
        : allMatching;

    const total = filtered.length;
    const skip = (page - 1) * limit;
    const pageItems = filtered.slice(skip, skip + limit);

    const items = pageItems.map((s) => {
      const m = metricsMap.get(s.id);
      return {
        ...s,
        lastActivityAt: m?.lastActivityAt ?? null,
        activityTier: m?.activityTier ?? 'draft',
        bookingsLast30d: m?.bookingsLast30d ?? 0,
        sessionsLast30d: m?.sessionsLast30d ?? 0,
        clientsCount: m?.clientsCount ?? 0,
      };
    });

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
