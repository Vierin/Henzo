import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringTrainingSessionsDto } from './dto/create-recurring-training-sessions.dto';
import { UpdateOwnerTrainingSessionDto } from './dto/update-owner-training-session.dto';

type SessionStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED';

@Injectable()
export class FitnessSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

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
    const fallback = 14;
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
      select: { id: true, reminderSettings: true },
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

    if (dto.trainerId) {
      const trainer = await this.prisma.trainer.findFirst({
        where: { id: dto.trainerId, studioId: dto.studioId },
        select: { id: true },
      });
      if (!trainer) {
        throw new Error('Trainer not found');
      }
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
          trainerId: dto.trainerId ?? undefined,
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

      const created = await this.prisma.trainingSession.create({
        data: {
          studioId: dto.studioId,
          trainingId: dto.trainingId,
          trainerId: dto.trainerId ?? null,
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
      select: { id: true },
    });
    if (!studio) return [];

    const where: any = { studioId: studio.id };
    if (fromIso || toIso) {
      where.startsAt = {};
      if (fromIso) where.startsAt.gte = new Date(fromIso);
      if (toIso) where.startsAt.lte = new Date(toIso);
    }

    const sessions = await this.prisma.trainingSession.findMany({
      where,
      include: {
        Training: { select: { name: true } },
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
        (e: any) => e.status === 'ACTIVE',
      ).length;
      return {
        sessionId: s.id,
        trainingId: s.trainingId,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        status: s.status,
        capacity: s.capacity,
        enrolledCount: activeEnrollments,
        attendanceSummary: { attended: activeEnrollments },
        training: { name: s.Training?.name || 'Training' },
        trainer: s.Trainer
          ? { id: s.Trainer.id, name: s.Trainer.name }
          : { id: null, name: '—' },
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
      dto.status !== undefined;
    if (!hasPatch) {
      return { success: true };
    }

    let startsAt = session.startsAt;
    let endsAt = session.endsAt;
    let trainerId: string | null = session.trainerId;
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

    if (dto.status !== undefined) {
      status = dto.status;
    }

    if (status === 'ACTIVE') {
      const overlapWhere: Prisma.TrainingSessionWhereInput = {
        studioId: session.studioId,
        id: { not: sessionId },
        status: 'ACTIVE',
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
        status,
      },
    });

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

  async getClientSchedule(
    authHeader: string,
    fromIso?: string,
    toIso?: string,
  ): Promise<any[]> {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    const userId = currentUser.user.id;

    const fromDate = fromIso ? new Date(fromIso) : new Date();
    const toDate = toIso
      ? new Date(toIso)
      : new Date(fromDate.getTime() + 1000 * 60 * 60 * 24 * 120);

    const enrollments = await this.prisma.sessionEnrollment.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        TrainingSession: {
          status: 'ACTIVE',
          startsAt: {
            gte: fromDate,
            lte: toDate,
          },
        },
      },
      select: {
        id: true,
        createdAt: true,
        TrainingSession: {
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            capacity: true,
            bookedCount: true,
            Training: {
              select: {
                id: true,
                name: true,
                duration: true,
                price: true,
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
              },
            },
          },
        },
      },
      orderBy: {
        TrainingSession: {
          startsAt: 'asc',
        },
      },
      take: 300,
    });

    return enrollments.map((e) => ({
      enrollmentId: e.id,
      bookedAt: e.createdAt.toISOString(),
      sessionId: e.TrainingSession.id,
      startsAt: e.TrainingSession.startsAt.toISOString(),
      endsAt: e.TrainingSession.endsAt.toISOString(),
      capacity: e.TrainingSession.capacity,
      bookedCount: e.TrainingSession.bookedCount,
      training: e.TrainingSession.Training
        ? {
            id: e.TrainingSession.Training.id,
            name: e.TrainingSession.Training.name,
            duration: e.TrainingSession.Training.duration,
            price: e.TrainingSession.Training.price,
          }
        : null,
      trainer: e.TrainingSession.Trainer
        ? {
            id: e.TrainingSession.Trainer.id,
            name: e.TrainingSession.Trainer.name,
          }
        : null,
      studio: e.TrainingSession.Studio
        ? {
            id: e.TrainingSession.Studio.id,
            name: e.TrainingSession.Studio.name,
            address: e.TrainingSession.Studio.address,
          }
        : null,
    }));
  }

  /**
   * 1:1 appointment bookings (SessionBooking) for owner apps — clients list, calendar hooks.
   * Shape matches mobile [DashboardApiService.getOwnerBookings] / [Booking.fromJson] after [time]→dateTime.
   */
  async getOwnerSessionBookings(
    authHeader: string,
    limit = 100,
  ): Promise<
    {
      id: string;
      time: string;
      status: string;
      notes: string | null;
      user: { name: string | null; email: string | null; phone: string | null };
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
    const rows = await this.prisma.sessionBooking.findMany({
      where: { studioId: studio.id },
      include: {
        User: { select: { name: true, email: true, phone: true } },
        Training: {
          select: { name: true, nameEn: true, price: true, duration: true },
        },
        Trainer: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: 'desc' },
      take,
    });

    return rows.map((b) => ({
      id: b.id,
      time: b.startsAt.toISOString(),
      status: b.status,
      notes: b.notes,
      user: {
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
}
