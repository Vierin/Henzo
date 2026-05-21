import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  Prisma,
  SessionEnrollmentStatus,
  StudioClientSource,
  TrainingSessionStatus,
} from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { EmailService } from '../email/email.service';
import { CreateRecurringTrainingSessionsDto } from './dto/create-recurring-training-sessions.dto';
import { UpdateOwnerTrainingSessionDto } from './dto/update-owner-training-session.dto';
import { computeTrainingDisplayColor } from '../trainings/training-color.util';
import {
  isDeliverableClientEmail,
  StudioClientsService,
} from './studio-clients.service';
import {
  countTrainingLocations,
  resolveSessionLocationDisplayName,
  resolveTrainingLocationName,
} from '../lib/training-locations';
import { resolveTrainerIdForSession } from './trainer-display.util';

type SessionStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED';

/** Hoisted so Prisma infers `TrainingSession.status` on client schedule rows (nested where + select inference bug). */
const clientScheduleEnrollmentSelect =
  Prisma.validator<Prisma.SessionEnrollmentSelect>()({
    id: true,
    createdAt: true,
    TrainingSession: {
      select: {
        id: true,
        status: true,
        startsAt: true,
        endsAt: true,
        capacity: true,
        bookedCount: true,
        locationId: true,
        Training: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            displayColor: true,
            trainingCategoryId: true,
            trainingCategory: {
              select: { chip_bg_hex: true },
            },
          },
        },
        Trainer: {
          select: {
            id: true,
            name: true,
          },
        },
        Studio: {
          select: {
            id: true,
            name: true,
            address: true,
            reminderSettings: true,
            User: { select: { name: true, email: true } },
          },
        },
      },
    },
  });

@Injectable()
export class FitnessSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly analytics: AnalyticsService,
    private readonly studioClients: StudioClientsService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Marks scheduled group sessions whose end time is in the past as COMPLETED.
   * Keeps analytics, owner calendar, and client schedule consistent without manual action.
   */
  async completePastTrainingSessions(): Promise<{ updated: number }> {
    const result = await this.prisma.trainingSession.updateMany({
      where: {
        status: TrainingSessionStatus.ACTIVE,
        endsAt: { lt: new Date() },
      },
      data: { status: TrainingSessionStatus.COMPLETED },
    });
    return { updated: result.count };
  }

  private parseHm(value: string): { hour: number; minute: number } {
    const [h, m] = value.split(':');
    return { hour: Number(h), minute: Number(m) };
  }

  private normalizeDateOnly(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private buildOccurrenceDates(
    startsFromDate: Date,
    daysOfWeek: number[],
    weeksCount: number,
  ): Date[] {
    const uniqueDays = Array.from(new Set(daysOfWeek)).sort((a, b) => a - b);
    const anchor = this.normalizeDateOnly(startsFromDate);
    const all: Date[] = [];
    for (let week = 0; week < weeksCount; week += 1) {
      for (const day of uniqueDays) {
        const mondayOffset = day - 1;
        const weekBase = new Date(anchor);
        weekBase.setDate(anchor.getDate() + week * 7);
        const weekDay = weekBase.getDay() === 0 ? 7 : weekBase.getDay();
        const delta = mondayOffset - (weekDay - 1);
        const candidate = new Date(weekBase);
        candidate.setDate(weekBase.getDate() + delta);
        if (candidate >= anchor) {
          all.push(candidate);
        }
      }
    }
    all.sort((a, b) => a.getTime() - b.getTime());
    return all;
  }

  private extractBookingPeriodDays(reminderSettings: unknown): number {
    const fallback = 28;
    if (!reminderSettings || typeof reminderSettings !== 'object')
      return fallback;
    const raw = (reminderSettings as Record<string, unknown>)[
      'bookingPeriodDays'
    ];
    let parsed: number | null = null;
    if (typeof raw === 'number') parsed = Math.floor(raw);
    if (typeof raw === 'string') parsed = Number.parseInt(raw, 10);
    if (!parsed || Number.isNaN(parsed)) return fallback;
    return Math.max(1, Math.min(60, parsed));
  }

  async createRecurringSessions(
    authHeader: string,
    dto: CreateRecurringTrainingSessionsDto,
  ) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    if (currentUser.user.role !== 'OWNER') {
      throw new Error('Forbidden');
    }

    const studio = await this.prisma.studio.findFirst({
      where: { id: dto.studioId, ownerId: currentUser.user.id },
      select: {
        id: true,
        name: true,
        reminderSettings: true,
        User: { select: { id: true, name: true, email: true } },
      },
    });
    if (!studio) {
      throw new Error('Studio not found or not owned by user');
    }

    const training = await this.prisma.training.findFirst({
      where: { id: dto.trainingId, studioId: dto.studioId },
      select: { id: true, duration: true },
    });
    if (!training) {
      throw new Error('Training not found');
    }

    const resolvedTrainerId = studio.User
      ? await resolveTrainerIdForSession(
          this.prisma,
          dto.studioId,
          studio.User,
          dto.trainerId,
        )
      : (dto.trainerId?.trim() ?? null);

    if (dto.trainerId?.trim() && !resolvedTrainerId) {
      throw new Error('Trainer not found');
    }

    const startsFrom = dto.startsFromDate
      ? new Date(dto.startsFromDate)
      : new Date();
    if (Number.isNaN(startsFrom.getTime())) {
      throw new Error('Invalid startsFromDate');
    }

    const slots =
      dto.slots && dto.slots.length > 0
        ? dto.slots
        : dto.daysOfWeek && dto.daysOfWeek.length > 0 && dto.startTime
          ? dto.daysOfWeek.map((day) => ({ day, startTime: dto.startTime! }))
          : [];
    if (slots.length === 0) {
      throw new Error('At least one recurrence slot is required');
    }

    const bookingPeriodDays = this.extractBookingPeriodDays(
      studio.reminderSettings,
    );
    const horizonEnd = this.normalizeDateOnly(new Date());
    horizonEnd.setDate(horizonEnd.getDate() + bookingPeriodDays);

    const candidateDays = this.buildOccurrenceDates(
      startsFrom,
      slots.map((s) => s.day),
      Math.ceil(bookingPeriodDays / 7) + 2,
    ).filter((d) => d <= horizonEnd);

    if (candidateDays.length === 0) {
      return {
        success: true,
        data: { createdCount: 0, skippedCount: 0, createdSessions: [] },
      };
    }

    const slotTimeByDay = new Map<number, string>();
    for (const slot of slots) {
      slotTimeByDay.set(slot.day, slot.startTime);
    }

    const candidates = candidateDays
      .map((d) => {
        const weekday = d.getDay() === 0 ? 7 : d.getDay();
        const time = slotTimeByDay.get(weekday);
        if (!time) return null;
        const { hour, minute } = this.parseHm(time);
        const startsAt = new Date(d);
        startsAt.setHours(hour, minute, 0, 0);
        const endsAt = new Date(startsAt);
        endsAt.setMinutes(endsAt.getMinutes() + training.duration);
        return { startsAt, endsAt };
      })
      .filter(
        (slot): slot is { startsAt: Date; endsAt: Date } => slot !== null,
      );

    const createdSessions: Array<{
      id: string;
      startsAt: string;
      endsAt: string;
      status: SessionStatus;
      capacity: number;
    }> = [];
    let skippedCount = 0;

    for (const slot of candidates) {
      const overlap = await this.prisma.trainingSession.findFirst({
        where: {
          studioId: dto.studioId,
          trainerId: resolvedTrainerId ?? undefined,
          startsAt: { lt: slot.endsAt },
          endsAt: { gt: slot.startsAt },
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      if (overlap) {
        skippedCount += 1;
        continue;
      }

      const locationId =
        dto.locationId?.trim() && dto.locationId.trim().length > 0
          ? dto.locationId.trim()
          : null;

      const created = await this.prisma.trainingSession.create({
        data: {
          studioId: dto.studioId,
          trainingId: dto.trainingId,
          trainerId: resolvedTrainerId,
          locationId,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          capacity: dto.capacity,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          status: true,
          capacity: true,
        },
      });

      createdSessions.push({
        id: created.id,
        startsAt: created.startsAt.toISOString(),
        endsAt: created.endsAt.toISOString(),
        status: created.status,
        capacity: created.capacity,
      });
    }

    return {
      success: true,
      data: {
        createdCount: createdSessions.length,
        skippedCount,
        createdSessions,
        bookingPeriodDays,
      },
    };
  }

  async getOwnerSessions(
    authHeader: string,
    fromIso?: string,
    toIso?: string,
  ): Promise<any[]> {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    if (currentUser.user.role !== 'OWNER') {
      throw new Error('Forbidden');
    }

    const studio = await this.prisma.studio.findFirst({
      where: { ownerId: currentUser.user.id },
      select: { id: true, name: true, reminderSettings: true },
    });
    if (!studio) return [];

    const studioName = studio.name?.trim() ?? 'Studio';
    const locationCount = countTrainingLocations(studio.reminderSettings);

    const ownerDisplayName =
      (currentUser.user.name && String(currentUser.user.name).trim()) ||
      (currentUser.user.email && String(currentUser.user.email).trim()) ||
      studioName;

    await this.completePastTrainingSessions();

    const where: any = { studioId: studio.id };
    if (fromIso || toIso) {
      where.startsAt = {};
      if (fromIso) where.startsAt.gte = new Date(fromIso);
      if (toIso) where.startsAt.lte = new Date(toIso);
    }

    const sessions = await this.prisma.trainingSession.findMany({
      where,
      include: {
        Training: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
            trainingCategoryId: true,
            displayColor: true,
            trainingCategory: {
              select: {
                chip_bg_hex: true,
                name_en: true,
                name_vn: true,
                name_ru: true,
              },
            },
          },
        },
        Trainer: { select: { id: true, name: true } },
        Enrollments: {
          select: { status: true },
        },
      },
      orderBy: { startsAt: 'asc' },
      take: 300,
    });

    return sessions.map((s: any) => {
      const activeEnrollments = (s.Enrollments || []).filter(
        (e: any) => e.status === 'ACTIVE' || e.status === 'NO_SHOW',
      ).length;
      const locationName =
        locationCount > 1
          ? (resolveTrainingLocationName(
              studio.reminderSettings,
              s.locationId,
              studioName,
            ) ?? studioName)
          : null;

      return {
        sessionId: s.id,
        trainingId: s.trainingId,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        status: s.status,
        capacity: s.capacity,
        enrolledCount: activeEnrollments,
        attendanceSummary: { attended: activeEnrollments },
        locationId: s.locationId ?? null,
        locationName,
        training: {
          name: s.Training?.name || 'Training',
          displayColor: computeTrainingDisplayColor({
            trainingId: s.trainingId,
            trainingName: s.Training?.name,
            trainingCategoryId: s.Training?.trainingCategoryId,
            categoryChipBgHex: s.Training?.trainingCategory?.chip_bg_hex,
            existingColor: s.Training?.displayColor,
          }),
          price:
            s.Training != null && s.Training.price != null
              ? Number(s.Training.price)
              : null,
          duration: s.Training?.duration ?? null,
          trainingCategory: s.Training?.trainingCategory
            ? {
                nameEn: s.Training.trainingCategory.name_en,
                nameVn: s.Training.trainingCategory.name_vn,
                nameRu: s.Training.trainingCategory.name_ru,
              }
            : null,
        },
        trainer: (() => {
          const tr = s.Trainer as { id: string; name: string } | null;
          if (tr?.name && String(tr.name).trim().length > 0) {
            return { id: tr.id, name: String(tr.name).trim() };
          }
          if (tr?.id) {
            return { id: tr.id, name: ownerDisplayName };
          }
          return { id: null, name: ownerDisplayName };
        })(),
      };
    });
  }

  async updateOwnerTrainingSession(
    authHeader: string,
    sessionId: string,
    dto: UpdateOwnerTrainingSessionDto,
  ) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    if (currentUser.user.role !== 'OWNER') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId },
      include: {
        Studio: { select: { ownerId: true } },
        Training: { select: { duration: true } },
      },
    });
    if (!session || session.Studio?.ownerId !== currentUser.user.id) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }

    const hasPatch =
      dto.startsAt !== undefined ||
      dto.trainerId !== undefined ||
      dto.locationId !== undefined ||
      dto.status !== undefined;
    if (!hasPatch) {
      return { success: true };
    }

    const applyToFollowing = dto.applyToFollowing === true;
    const anchorOriginalStart = session.startsAt;

    let startsAt = session.startsAt;
    let endsAt = session.endsAt;
    let trainerId: string | null = session.trainerId;
    let locationId: string | null = session.locationId;
    let status = session.status;

    if (dto.startsAt !== undefined) {
      const d = new Date(dto.startsAt);
      if (Number.isNaN(d.getTime())) {
        throw new HttpException('Invalid startsAt', HttpStatus.BAD_REQUEST);
      }
      startsAt = d;
      endsAt = new Date(startsAt);
      endsAt.setMinutes(endsAt.getMinutes() + session.Training.duration);
    }

    if (dto.trainerId !== undefined) {
      const raw = dto.trainerId;
      if (raw === null || raw === '') {
        trainerId = null;
      } else {
        const trainer = await this.prisma.trainer.findFirst({
          where: { id: raw, studioId: session.studioId },
          select: { id: true },
        });
        if (!trainer) {
          throw new HttpException('Trainer not found', HttpStatus.BAD_REQUEST);
        }
        trainerId = raw;
      }
    }

    if (dto.locationId !== undefined) {
      const raw = dto.locationId;
      locationId = raw === null || raw === '' ? null : raw.trim();
    }

    if (dto.status !== undefined) {
      status = dto.status;
    }

    if (!applyToFollowing) {
      if (status === TrainingSessionStatus.ACTIVE) {
        const overlapWhere: Prisma.TrainingSessionWhereInput = {
          studioId: session.studioId,
          id: { not: sessionId },
          status: TrainingSessionStatus.ACTIVE,
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
          ...(trainerId ? { trainerId } : {}),
        };
        const overlap = await this.prisma.trainingSession.findFirst({
          where: overlapWhere,
          select: { id: true },
        });
        if (overlap) {
          throw new HttpException(
            'Time slot conflicts with another session',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      await this.prisma.trainingSession.update({
        where: { id: sessionId },
        data: {
          startsAt,
          endsAt,
          trainerId,
          locationId,
          status,
        },
      });

      return { success: true };
    }

    const timeDeltaMs =
      dto.startsAt !== undefined
        ? startsAt.getTime() - anchorOriginalStart.getTime()
        : null;

    const rows = await this.prisma.trainingSession.findMany({
      where: {
        studioId: session.studioId,
        trainingId: session.trainingId,
        startsAt: { gte: anchorOriginalStart },
        status: TrainingSessionStatus.ACTIVE,
      },
      orderBy: { startsAt: 'asc' },
      include: { Training: { select: { duration: true } } },
    });

    const batchIds = rows.map((r) => r.id);

    type Plan = {
      id: string;
      startsAt: Date;
      endsAt: Date;
      trainerId: string | null;
      locationId: string | null;
      status: TrainingSessionStatus;
    };

    const planned: Plan[] = rows.map((row) => {
      let ns = row.startsAt;
      let ne = row.endsAt;
      if (timeDeltaMs !== null) {
        ns = new Date(row.startsAt.getTime() + timeDeltaMs);
        ne = new Date(ns);
        ne.setMinutes(ne.getMinutes() + row.Training.duration);
      }
      const tid = dto.trainerId !== undefined ? trainerId : row.trainerId;
      const lid = dto.locationId !== undefined ? locationId : row.locationId;
      const st = dto.status !== undefined ? status : row.status;
      return {
        id: row.id,
        startsAt: ns,
        endsAt: ne,
        trainerId: tid,
        locationId: lid,
        status: st,
      };
    });

    for (const p of planned) {
      if (p.status !== TrainingSessionStatus.ACTIVE) {
        continue;
      }
      const overlapWhere: Prisma.TrainingSessionWhereInput = {
        studioId: session.studioId,
        id: { notIn: batchIds },
        status: TrainingSessionStatus.ACTIVE,
        startsAt: { lt: p.endsAt },
        endsAt: { gt: p.startsAt },
        ...(p.trainerId ? { trainerId: p.trainerId } : {}),
      };
      const overlap = await this.prisma.trainingSession.findFirst({
        where: overlapWhere,
        select: { id: true },
      });
      if (overlap) {
        throw new HttpException(
          'Time slot conflicts with another session',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    await this.prisma.$transaction(
      planned.map((p) =>
        this.prisma.trainingSession.update({
          where: { id: p.id },
          data: {
            startsAt: p.startsAt,
            endsAt: p.endsAt,
            trainerId: p.trainerId,
            locationId: p.locationId,
            status: p.status,
          },
        }),
      ),
    );

    return { success: true };
  }

  async updateOwnerSessionStatus(
    authHeader: string,
    sessionId: string,
    status: SessionStatus,
  ) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    if (currentUser.user.role !== 'OWNER') {
      throw new Error('Forbidden');
    }

    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId },
      include: { Studio: { select: { ownerId: true } } },
    });
    if (!session || session.Studio?.ownerId !== currentUser.user.id) {
      throw new Error('Session not found');
    }

    await this.prisma.trainingSession.update({
      where: { id: sessionId },
      data: { status },
    });

    return { success: true };
  }

  private async getOwnedSessionOrThrow(authHeader: string, sessionId: string) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    if (currentUser.user.role !== 'OWNER') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: sessionId },
      include: {
        Studio: { select: { ownerId: true } },
        Training: { select: { price: true } },
      },
    });
    if (!session || session.Studio?.ownerId !== currentUser.user.id) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }
    return { currentUser, session };
  }

  async getOwnerSessionEnrollments(authHeader: string, sessionId: string) {
    await this.getOwnedSessionOrThrow(authHeader, sessionId);
    const rows = await this.prisma.sessionEnrollment.findMany({
      where: { sessionId },
      select: {
        id: true,
        userId: true,
        status: true,
        createdAt: true,
        cancelledAt: true,
        User: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => ({
      enrollmentId: r.id,
      userId: r.userId,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      cancelledAt: r.cancelledAt?.toISOString() ?? null,
      user: {
        name: r.User.name,
        email: r.User.email,
        phone: r.User.phone,
      },
    }));
  }

  async addOwnerSessionEnrollment(
    authHeader: string,
    sessionId: string,
    payload: {
      userId?: string;
      name?: string;
      email?: string;
      phone?: string;
      sendConfirmationEmail?: boolean;
      anonymousSpot?: boolean;
      locale?: 'en' | 'ru' | 'vi';
    },
  ) {
    const { session } = await this.getOwnedSessionOrThrow(
      authHeader,
      sessionId,
    );
    const studioId = session.studioId;
    let targetUserId = payload.userId?.trim();

    if (payload.anonymousSpot) {
      const u = await this.studioClients.createAnonymousSpotUser();
      targetUserId = u.id;
    } else if (!targetUserId) {
      const name = payload.name?.trim() || '';
      const emailRaw = payload.email?.trim().toLowerCase() || '';
      if (name.length === 0 || emailRaw.length === 0) {
        throw new HttpException(
          'name and email are required',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
        throw new HttpException('invalid email', HttpStatus.BAD_REQUEST);
      }
      const user = await this.studioClients.findOrCreateClientUser({
        name,
        email: emailRaw,
        phone: payload.phone?.trim() || null,
      });
      targetUserId = user.id;
    }

    const existing = await this.prisma.sessionEnrollment.findFirst({
      where: { sessionId, userId: targetUserId },
      select: { id: true, status: true },
    });

    if (!existing && (session.bookedCount ?? 0) >= session.capacity) {
      throw new HttpException('No spots left', HttpStatus.BAD_REQUEST);
    }

    let wasCreated = false;
    await this.prisma.$transaction(async (tx) => {
      if (existing) {
        if (existing.status === SessionEnrollmentStatus.ACTIVE) {
          return;
        }
        await tx.sessionEnrollment.update({
          where: { id: existing.id },
          data: {
            status: SessionEnrollmentStatus.ACTIVE,
            cancelledAt: null,
          },
        });
        wasCreated = true;
      } else {
        await tx.sessionEnrollment.create({
          data: {
            sessionId,
            userId: targetUserId!,
            status: SessionEnrollmentStatus.ACTIVE,
          },
        });
        await tx.trainingSession.update({
          where: { id: sessionId },
          data: { bookedCount: { increment: 1 } },
        });
        wasCreated = true;
      }
    });

    await this.studioClients.ensureStudioClient(
      studioId,
      targetUserId!,
      StudioClientSource.ENROLLMENT,
    );

    if (wasCreated) {
      this.analytics.track(targetUserId!, 'booking_created', {
        session_id: sessionId,
        studio_id: studioId,
        source: 'owner_added',
      });
    }

    try {
      if (payload.sendConfirmationEmail && !payload.anonymousSpot) {
        await this.sendEnrollmentConfirmationEmail(
          sessionId,
          targetUserId!,
          payload.locale,
        );
      }
    } catch (e) {
      console.error('post-enrollment email failed:', e);
    }

    return { success: true };
  }

  private async sendEnrollmentConfirmationEmail(
    sessionId: string,
    userId: string,
    locale?: 'en' | 'ru' | 'vi',
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user || !isDeliverableClientEmail(user.email)) {
      return;
    }
    const row = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        Studio: {
          select: {
            name: true,
            address: true,
            phone: true,
            timezone: true,
          },
        },
        Training: { select: { name: true, duration: true, price: true } },
        Trainer: { select: { name: true } },
      },
    });
    if (!row?.Studio) {
      return;
    }
    const salonTz = row.Studio.timezone ?? 'Asia/Ho_Chi_Minh';
    const loc = locale === 'ru' ? 'ru-RU' : locale === 'vi' ? 'vi-VN' : 'en-US';
    const dateFmt = new Intl.DateTimeFormat(loc, {
      timeZone: salonTz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(row.startsAt);
    const timeFmt = new Intl.DateTimeFormat(loc, {
      timeZone: salonTz,
      hour: '2-digit',
      minute: '2-digit',
    }).format(row.startsAt);

    await this.emailService.sendBookingConfirmation(
      user.email,
      (user.name ?? user.email).trim(),
      {
        serviceName: row.Training?.name ?? 'Class',
        date: dateFmt,
        time: timeFmt,
        duration: row.Training?.duration ?? 60,
        price: Number(row.Training?.price ?? 0),
        salonName: row.Studio.name,
        salonAddress: row.Studio.address ?? undefined,
        salonPhone: row.Studio.phone ?? undefined,
        staffName: row.Trainer?.name,
        dateTime: row.startsAt,
        salonTimezone: salonTz,
        locale,
      },
    );
  }

  async updateOwnerEnrollmentStatus(
    authHeader: string,
    enrollmentId: string,
    status: 'ACTIVE' | 'NO_SHOW' | 'CANCELLED',
  ) {
    const row = await this.prisma.sessionEnrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        status: true,
        sessionId: true,
      },
    });
    if (!row) {
      throw new HttpException('Enrollment not found', HttpStatus.NOT_FOUND);
    }
    await this.getOwnedSessionOrThrow(authHeader, row.sessionId);

    const nextStatus = status as SessionEnrollmentStatus;
    if (row.status === nextStatus) {
      return { success: true };
    }

    await this.completePastTrainingSessions();

    const sessionEndsAt = await this.prisma.trainingSession.findUnique({
      where: { id: row.sessionId },
      select: { endsAt: true },
    });
    if (!sessionEndsAt) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }
    const now = new Date();
    if (
      nextStatus === SessionEnrollmentStatus.NO_SHOW &&
      sessionEndsAt.endsAt > now
    ) {
      throw new HttpException(
        'NO_SHOW can be set only after the session has ended',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.sessionEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: nextStatus,
          cancelledAt:
            nextStatus === SessionEnrollmentStatus.CANCELLED
              ? new Date()
              : null,
        },
      });

      if (
        row.status === SessionEnrollmentStatus.ACTIVE &&
        nextStatus === SessionEnrollmentStatus.CANCELLED
      ) {
        await tx.trainingSession.update({
          where: { id: row.sessionId },
          data: { bookedCount: { decrement: 1 } },
        });
      }

      if (
        row.status === SessionEnrollmentStatus.CANCELLED &&
        nextStatus === SessionEnrollmentStatus.ACTIVE
      ) {
        await tx.trainingSession.update({
          where: { id: row.sessionId },
          data: { bookedCount: { increment: 1 } },
        });
      }
    });

    if (
      row.status === SessionEnrollmentStatus.ACTIVE &&
      nextStatus === SessionEnrollmentStatus.CANCELLED
    ) {
      const enrollment = await this.prisma.sessionEnrollment.findUnique({
        where: { id: enrollmentId },
        select: {
          userId: true,
          TrainingSession: { select: { studioId: true } },
        },
      });
      this.analytics.track(enrollment?.userId ?? null, 'booking_cancelled', {
        enrollment_id: enrollmentId,
        session_id: row.sessionId,
        studio_id: enrollment?.TrainingSession?.studioId,
        source: 'owner_cancelled',
      });
    }

    return { success: true };
  }

  /** Client cancels their own class enrollment (group session). */
  async cancelClientOwnEnrollment(authHeader: string, enrollmentId: string) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    const row = await this.prisma.sessionEnrollment.findFirst({
      where: { id: enrollmentId, userId: currentUser.user.id },
      select: {
        id: true,
        status: true,
        sessionId: true,
      },
    });
    if (!row) {
      throw new HttpException('Enrollment not found', HttpStatus.NOT_FOUND);
    }
    if (row.status !== SessionEnrollmentStatus.ACTIVE) {
      return { success: true };
    }

    await this.completePastTrainingSessions();

    const sessionRow = await this.prisma.trainingSession.findUnique({
      where: { id: row.sessionId },
      select: { endsAt: true },
    });
    if (!sessionRow) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }
    const now = new Date();
    if (sessionRow.endsAt <= now) {
      throw new HttpException('Session already ended', HttpStatus.BAD_REQUEST);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.sessionEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: SessionEnrollmentStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });
      await tx.trainingSession.update({
        where: { id: row.sessionId },
        data: { bookedCount: { decrement: 1 } },
      });
    });

    const enrollment = await this.prisma.sessionEnrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        userId: true,
        TrainingSession: { select: { studioId: true } },
      },
    });
    this.analytics.track(enrollment?.userId ?? null, 'booking_cancelled', {
      enrollment_id: enrollmentId,
      session_id: row.sessionId,
      studio_id: enrollment?.TrainingSession?.studioId,
      source: 'client_cancelled',
    });

    return { success: true };
  }

  async getClientSchedule(
    authHeader: string,
    fromIso?: string,
    toIso?: string,
  ): Promise<any[]> {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    const userId = currentUser.user.id;

    await this.completePastTrainingSessions();

    const fromDate = fromIso ? new Date(fromIso) : new Date();
    const toDate = toIso
      ? new Date(toIso)
      : new Date(fromDate.getTime() + 1000 * 60 * 60 * 24 * 120);

    const enrollments = await this.prisma.sessionEnrollment.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        TrainingSession: {
          status: {
            in: [TrainingSessionStatus.ACTIVE, TrainingSessionStatus.COMPLETED],
          },
          startsAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
      },
      select: clientScheduleEnrollmentSelect,
      orderBy: {
        TrainingSession: {
          startsAt: 'asc',
        },
      },
      take: 300,
    });

    const studioIds = [
      ...new Set(
        enrollments
          .map((e) => e.TrainingSession.Studio?.id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const reviewedStudioRows =
      studioIds.length > 0
        ? await this.prisma.review.findMany({
            where: {
              userId,
              studioId: { in: studioIds },
              bookingId: null,
            },
            select: { studioId: true },
          })
        : [];
    const reviewedStudioIds = new Set(
      reviewedStudioRows.map((r) => r.studioId),
    );

    return enrollments.map((e) => {
      const studio = e.TrainingSession.Studio;
      const studioName = studio?.name?.trim() ?? 'Studio';
      const ownerDisplayName =
        studio?.User?.name?.trim() || studio?.User?.email?.trim() || studioName;
      const locationCount = studio
        ? countTrainingLocations(studio.reminderSettings)
        : 1;
      const locationName = resolveSessionLocationDisplayName(
        studio?.reminderSettings,
        e.TrainingSession.locationId,
        studioName,
      );

      return {
        enrollmentId: e.id,
        bookedAt: e.createdAt.toISOString(),
        sessionId: e.TrainingSession.id,
        startsAt: e.TrainingSession.startsAt.toISOString(),
        endsAt: e.TrainingSession.endsAt.toISOString(),
        sessionStatus: e.TrainingSession.status,
        capacity: e.TrainingSession.capacity,
        bookedCount: e.TrainingSession.bookedCount,
        locationId: e.TrainingSession.locationId ?? null,
        locationName,
        training: e.TrainingSession.Training
          ? {
              id: e.TrainingSession.Training.id,
              name: e.TrainingSession.Training.name,
              duration: e.TrainingSession.Training.duration,
              price: e.TrainingSession.Training.price,
              displayColor: computeTrainingDisplayColor({
                trainingId: e.TrainingSession.Training.id,
                trainingName: e.TrainingSession.Training.name,
                trainingCategoryId:
                  e.TrainingSession.Training.trainingCategoryId,
                categoryChipBgHex:
                  e.TrainingSession.Training.trainingCategory?.chip_bg_hex,
                existingColor: e.TrainingSession.Training.displayColor,
              }),
            }
          : null,
        trainer: (() => {
          const tr = e.TrainingSession.Trainer;
          if (tr?.name && String(tr.name).trim().length > 0) {
            return { id: tr.id, name: String(tr.name).trim() };
          }
          return { id: tr?.id ?? null, name: ownerDisplayName };
        })(),
        studio: e.TrainingSession.Studio
          ? {
              id: e.TrainingSession.Studio.id,
              name: e.TrainingSession.Studio.name,
              address: e.TrainingSession.Studio.address,
              locationCount,
            }
          : null,
        hasReview: studio?.id ? reviewedStudioIds.has(studio.id) : false,
      };
    });
  }

  async getClientProfileStats(authHeader: string): Promise<{
    classesVisited: number;
    upcomingClasses: number;
    activePasses: number;
  }> {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    const userId = currentUser.user.id;

    await this.completePastTrainingSessions();

    const now = new Date();
    const [classesVisited, upcomingClasses] = await Promise.all([
      this.prisma.sessionEnrollment.count({
        where: {
          userId,
          status: SessionEnrollmentStatus.ACTIVE,
          TrainingSession: {
            endsAt: { lt: now },
            status: {
              in: [
                TrainingSessionStatus.COMPLETED,
                TrainingSessionStatus.ACTIVE,
              ],
            },
          },
        },
      }),
      this.prisma.sessionEnrollment.count({
        where: {
          userId,
          status: SessionEnrollmentStatus.ACTIVE,
          TrainingSession: {
            startsAt: { gte: now },
            status: TrainingSessionStatus.ACTIVE,
          },
        },
      }),
    ]);

    return {
      classesVisited,
      upcomingClasses,
      activePasses: 0,
    };
  }

  /**
   * 1:1 appointment bookings (SessionBooking) for owner apps — clients list, calendar hooks.
   * Shape matches mobile [DashboardApiService.getOwnerBookings] / [Booking.fromJson] after [time]→dateTime.
   */
  async getOwnerSessionBookings(
    authHeader: string,
    limit = 100,
    page = 1,
  ): Promise<
    {
      id: string;
      time: string;
      status: string;
      notes: string | null;
      user: {
        id: string | null;
        name: string | null;
        email: string | null;
        phone: string | null;
      };
      service: { name: string; price: number | null; duration: number | null };
      staff: { id: string; name: string } | null;
      staffId: string | null;
      serviceId: string;
    }[]
  > {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    if (currentUser.user.role !== 'OWNER') {
      throw new Error('Forbidden');
    }

    const studio = await this.prisma.studio.findFirst({
      where: { ownerId: currentUser.user.id },
      select: { id: true },
    });
    if (!studio) {
      return [];
    }

    const take = Math.min(Math.max(1, limit), 500);
    const skip = (Math.max(1, page) - 1) * take;
    const rows = await this.prisma.sessionBooking.findMany({
      where: { studioId: studio.id },
      include: {
        User: { select: { id: true, name: true, email: true, phone: true } },
        Training: {
          select: { name: true, nameEn: true, price: true, duration: true },
        },
        Trainer: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: 'desc' },
      take,
      skip,
    });

    return rows.map((b) => ({
      id: b.id,
      time: b.startsAt.toISOString(),
      status: b.status,
      notes: b.notes,
      user: {
        id: b.User.id,
        name: b.User.name,
        email: b.User.email,
        phone: b.User.phone,
      },
      service: {
        name: (b.Training?.name ?? b.Training?.nameEn ?? '—').trim() || '—',
        price: b.Training != null ? Number(b.Training.price) : null,
        duration: b.Training?.duration ?? null,
      },
      staff: b.Trainer ? { id: b.Trainer.id, name: b.Trainer.name } : null,
      staffId: b.trainerId,
      serviceId: b.trainingId,
    }));
  }

  private async getOwnerStudioId(authHeader: string): Promise<string> {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    if (currentUser.user.role !== 'OWNER') {
      throw new Error('Forbidden');
    }
    const studio = await this.prisma.studio.findFirst({
      where: { ownerId: currentUser.user.id },
      select: { id: true },
    });
    if (!studio) {
      throw new Error('Studio not found');
    }
    return studio.id;
  }

  async getOwnerClientBlocklist(authHeader: string) {
    const studioId = await this.getOwnerStudioId(authHeader);
    const rows = await this.prisma.studioClientBlock.findMany({
      where: { studioId },
      select: {
        id: true,
        userId: true,
        email: true,
        phone: true,
        reason: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      email: r.email,
      phone: r.phone,
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async blockOwnerClient(
    authHeader: string,
    input: { userId?: string; email?: string; phone?: string; reason?: string },
  ) {
    const studioId = await this.getOwnerStudioId(authHeader);
    const userId = input.userId?.trim() || null;
    const email = input.email?.trim().toLowerCase() || null;
    const phone = input.phone?.trim() || null;
    if (!userId && !email && !phone) {
      throw new HttpException(
        'userId or email or phone is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existing = await this.prisma.studioClientBlock.findFirst({
      where: {
        studioId,
        OR: [
          ...(userId ? [{ userId }] : []),
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
      select: { id: true },
    });
    if (existing) return { success: true, alreadyBlocked: true };

    await this.prisma.studioClientBlock.create({
      data: {
        studioId,
        userId,
        email,
        phone,
        reason: input.reason?.trim() || null,
      },
    });
    return { success: true };
  }

  async unblockOwnerClient(
    authHeader: string,
    input: { userId?: string; email?: string; phone?: string },
  ) {
    const studioId = await this.getOwnerStudioId(authHeader);
    const userId = input.userId?.trim() || null;
    const email = input.email?.trim().toLowerCase() || null;
    const phone = input.phone?.trim() || null;
    if (!userId && !email && !phone) {
      throw new HttpException(
        'userId or email or phone is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.studioClientBlock.deleteMany({
      where: {
        studioId,
        OR: [
          ...(userId ? [{ userId }] : []),
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
    });
    return { success: true };
  }
}
