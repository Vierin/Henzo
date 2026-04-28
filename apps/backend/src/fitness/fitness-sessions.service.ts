import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringTrainingSessionsDto } from './dto/create-recurring-training-sessions.dto';

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
        Trainer: { select: { name: true } },
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
        trainer: { name: s.Trainer?.name || '—' },
      };
    });
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
}
