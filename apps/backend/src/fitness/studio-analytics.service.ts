import {
  ForbiddenException,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { BookingStatus, SubscriptionStatus, SubscriptionType } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * KPI definitions for owner studio analytics:
 *
 * **Period filter (from / to):** applies to `startsAt` on SessionBooking and TrainingSession
 * (ISO range from the client — typically local day start/end converted to UTC).
 *
 * **SessionBooking (1:1 appointments):** revenue = sum of linked Training.price for rows where
 * status ≠ CANCELED.
 *
 * **SessionEnrollment (group classes):** active enrollments for sessions in period also contribute
 * to revenue and total "bookings" (counted as paid class spots).
 *
 * **TrainingSession + SessionEnrollment (group classes):** scheduled sessions by calendar;
 * enrollments counted with session `startsAt` in range. Cancellations: enrollment status
 * CANCELLED with cancelledAt in range (when set), else status-only in range.
 *
 * **Client segments (rolling 90 days ending at `to`):**
 * - regular: ≥2 qualifying attendances (bookings or active enrollments) with startsAt in that window
 * - newInPeriod: first-ever studio touch (min startsAt across bookings + enrollments) falls in [from, to]
 * - inactive: had any studio touch before, but last startsAt strictly before rolling window start
 */
@Injectable()
export class StudioAnalyticsService {
  private readonly enrollmentRevenueStatuses = new Set([
    'ACTIVE',
    'NO_SHOW',
    'NOSHOW',
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async getCurrentStudioAnalytics(
    authHeader: string | undefined,
    fromIso: string | undefined,
    toIso: string | undefined,
  ) {
    if (!fromIso || !toIso) {
      throw new BadRequestException(
        'from and to query parameters are required',
      );
    }
    const from = new Date(fromIso);
    const to = new Date(toIso);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid from or to date');
    }
    if (from > to) {
      throw new BadRequestException('from must be before or equal to to');
    }

    const currentUser = await this.authService.getCurrentUser(authHeader ?? '');
    if (currentUser.user.role !== 'OWNER') {
      throw new ForbiddenException('Forbidden');
    }

    const studio = await this.prisma.studio.findFirst({
      where: { ownerId: currentUser.user.id },
      select: { id: true },
    });
    if (!studio) {
      return { success: true, needsSetup: true, data: null };
    }

    const studioId = studio.id;
    const bookingWherePeriod = {
      studioId,
      startsAt: { gte: from, lte: to },
      status: { not: BookingStatus.CANCELED },
    };
    const [subscription, bookingsInPeriod] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: { studioId },
        select: { type: true, status: true },
      }),
      this.prisma.sessionBooking.findMany({
        where: bookingWherePeriod,
        select: {
          trainingId: true,
          status: true,
          Training: { select: { price: true } },
        },
      }),
    ]);
    const isPro =
      subscription?.type === SubscriptionType.PRO &&
      subscription?.status === SubscriptionStatus.ACTIVE;

    const appointmentRevenue = bookingsInPeriod.reduce((s, b) => {
      const p = b.Training?.price;
      return s + (typeof p === 'number' ? p : 0);
    }, 0);

    const appointmentBookingCount = bookingsInPeriod.length;
    const noshowCount = bookingsInPeriod.filter(
      (b) => b.status === BookingStatus.NOSHOW,
    ).length;
    const completedBookingCount = bookingsInPeriod.filter(
      (b) => b.status === BookingStatus.COMPLETED,
    ).length;
    const attendanceDenom = completedBookingCount + noshowCount;
    const attendanceRate =
      attendanceDenom > 0 ? completedBookingCount / attendanceDenom : null;

    const sessionWherePeriod = {
      studioId,
      startsAt: { gte: from, lte: to },
    };

    const trainingSessions = await this.prisma.trainingSession.findMany({
      where: sessionWherePeriod,
      select: {
        id: true,
        trainingId: true,
        trainerId: true,
        status: true,
        capacity: true,
        bookedCount: true,
        Training: { select: { name: true } },
        Trainer: { select: { name: true } },
      },
    });

    const trainingSessionsScheduled = trainingSessions.length;
    const trainingSessionsCancelled = trainingSessions.filter(
      (s) => s.status === 'CANCELLED',
    ).length;

    const sessionIdsInPeriod = trainingSessions.map((s) => s.id);

    const enrollmentsForSessions =
      sessionIdsInPeriod.length > 0
        ? await this.prisma.sessionEnrollment.findMany({
            where: { sessionId: { in: sessionIdsInPeriod } },
            select: {
              status: true,
              cancelledAt: true,
              sessionId: true,
            },
          })
        : [];

    const activeEnrollmentsWithPriceRaw =
      sessionIdsInPeriod.length > 0
        ? await this.prisma.sessionEnrollment.findMany({
            where: {
              sessionId: { in: sessionIdsInPeriod },
            },
            select: {
              status: true,
              TrainingSession: {
                select: {
                  Training: {
                    select: { price: true },
                  },
                },
              },
            },
          })
        : [];
    const activeEnrollmentsWithPrice = activeEnrollmentsWithPriceRaw.filter((e) =>
      this.enrollmentRevenueStatuses.has(String(e.status)),
    );

    const classRevenue = activeEnrollmentsWithPrice.reduce((sum, e) => {
      const p = e.TrainingSession?.Training?.price;
      return sum + (typeof p === 'number' ? p : 0);
    }, 0);
    const classBookingCount = activeEnrollmentsWithPrice.length;

    const revenueTotal = appointmentRevenue + classRevenue;
    const bookingCount = appointmentBookingCount + classBookingCount;
    const averagePerBooking =
      bookingCount > 0 ? revenueTotal / bookingCount : 0;

    let enrollmentsActive = 0;
    let enrollmentsCancelled = 0;
    for (const e of enrollmentsForSessions) {
      if (e.status === 'ACTIVE') enrollmentsActive += 1;
      if (e.status === 'CANCELLED') enrollmentsCancelled += 1;
    }

    const activeEnrollmentsBySession = new Map<string, number>();
    for (const e of enrollmentsForSessions) {
      if (e.status !== 'ACTIVE') continue;
      activeEnrollmentsBySession.set(
        e.sessionId,
        (activeEnrollmentsBySession.get(e.sessionId) ?? 0) + 1,
      );
    }
    let utilizationSum = 0;
    let utilizationN = 0;
    if (isPro) {
      for (const s of trainingSessions) {
        if (s.status === 'CANCELLED') continue;
        const cap = Math.max(1, s.capacity || 1);
        const enrolled = activeEnrollmentsBySession.get(s.id) ?? 0;
        const occ = Math.max(enrolled, s.bookedCount ?? 0);
        utilizationSum += occ / cap;
        utilizationN += 1;
      }
    }
    const averageUtilization =
      utilizationN > 0 ? utilizationSum / utilizationN : 0;

    const trainingBookingCounts = new Map<string, number>();
    for (const b of bookingsInPeriod) {
      const tid = b.trainingId;
      trainingBookingCounts.set(tid, (trainingBookingCounts.get(tid) ?? 0) + 1);
    }
    const trainingSessionCounts = new Map<string, number>();
    for (const s of trainingSessions) {
      trainingSessionCounts.set(
        s.trainingId,
        (trainingSessionCounts.get(s.trainingId) ?? 0) + 1,
      );
    }

    let topTrainingId: string | null = null;
    let topScore = -1;
    const trainingIds = new Set<string>([
      ...trainingBookingCounts.keys(),
      ...trainingSessionCounts.keys(),
    ]);
    for (const tid of trainingIds) {
      const score =
        (trainingBookingCounts.get(tid) ?? 0) +
        (trainingSessionCounts.get(tid) ?? 0);
      if (score > topScore) {
        topScore = score;
        topTrainingId = tid;
      }
    }

    const trainingNameById = new Map<string, string>();
    for (const s of trainingSessions) {
      if (s.trainingId && s.Training?.name) {
        trainingNameById.set(s.trainingId, s.Training.name);
      }
    }
    const topTrainingName = topTrainingId
      ? (trainingNameById.get(topTrainingId) ?? null)
      : null;

    const trainerSessionCounts = new Map<string | null, number>();
    for (const s of trainingSessions) {
      const tid = s.trainerId;
      trainerSessionCounts.set(tid, (trainerSessionCounts.get(tid) ?? 0) + 1);
    }
    trainerSessionCounts.delete(null);
    let topTrainerId: string | null = null;
    let topTrainerSessions = 0;
    for (const [tid, c] of trainerSessionCounts) {
      if (tid && c > topTrainerSessions) {
        topTrainerSessions = c;
        topTrainerId = tid;
      }
    }
    const trainerNameById = new Map<string, string>();
    for (const s of trainingSessions) {
      if (s.trainerId && s.Trainer?.name) {
        trainerNameById.set(s.trainerId, s.Trainer.name);
      }
    }
    const topTrainerName = topTrainerId
      ? (trainerNameById.get(topTrainerId) ?? null)
      : null;

    const activeTrainingIdsInPeriod = new Set<string>(trainingIds);
    const trainingsActiveInPeriod = activeTrainingIdsInPeriod.size;

    const clientsForTier = isPro
      ? await this.computeClientSegments(studioId, from, to)
      : {
          total: await this.computeClientTotal(studioId),
          regular: 0,
          newInPeriod: 0,
          inactive: 0,
        };

    return {
      success: true,
      needsSetup: false,
      data: {
        period: { from: from.toISOString(), to: to.toISOString() },
        analyticsTier: isPro ? 'PRO' : 'FREEMIUM',
        isPro,
        proLocked: !isPro,
        revenueTotal,
        bookingCount,
        averagePerBooking: isPro ? averagePerBooking : 0,
        noshowCount: isPro ? noshowCount : 0,
        completedBookingCount: isPro ? completedBookingCount : 0,
        attendanceRate: isPro ? attendanceRate : null,
        trainingSessionsScheduled: isPro ? trainingSessionsScheduled : 0,
        trainingSessionsCancelled: isPro ? trainingSessionsCancelled : 0,
        enrollmentsActive: isPro ? enrollmentsActive : 0,
        enrollmentsCancelled: isPro ? enrollmentsCancelled : 0,
        averageUtilization: isPro ? averageUtilization : 0,
        topTraining:
          isPro &&
          topTrainingId && topTrainingName
            ? {
                id: topTrainingId,
                name: topTrainingName,
                score: topScore,
              }
            : null,
        topTrainer:
          isPro &&
          topTrainerId && topTrainerName
            ? {
                id: topTrainerId,
                name: topTrainerName,
                sessionCount: topTrainerSessions,
              }
            : null,
        trainingsActiveInPeriod: isPro ? trainingsActiveInPeriod : 0,
        clients: clientsForTier,
      },
    };
  }

  private async computeClientSegments(studioId: string, from: Date, to: Date) {
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    const rollingStart = new Date(to.getTime() - ninetyDaysMs);

    const bookingRows = await this.prisma.sessionBooking.findMany({
      where: {
        studioId,
        status: { not: BookingStatus.CANCELED },
      },
      select: { userId: true, startsAt: true },
    });

    const enrollmentRowsRaw = await this.prisma.sessionEnrollment.findMany({
      where: {
        TrainingSession: { studioId },
      },
      select: {
        status: true,
        userId: true,
        TrainingSession: { select: { startsAt: true } },
      },
    });
    const enrollmentRows = enrollmentRowsRaw.filter((r) =>
      this.enrollmentRevenueStatuses.has(String(r.status)),
    );

    const visitsByUser = new Map<string, Date[]>();
    for (const r of bookingRows) {
      const arr = visitsByUser.get(r.userId) ?? [];
      arr.push(r.startsAt);
      visitsByUser.set(r.userId, arr);
    }
    for (const r of enrollmentRows) {
      const st = r.TrainingSession?.startsAt;
      if (!st) continue;
      const arr = visitsByUser.get(r.userId) ?? [];
      arr.push(st);
      visitsByUser.set(r.userId, arr);
    }

    let total = 0;
    let regular = 0;
    let newInPeriod = 0;
    let inactive = 0;

    for (const [, dates] of visitsByUser) {
      if (dates.length === 0) continue;
      dates.sort((a, b) => a.getTime() - b.getTime());
      const firstTouch = dates[0]!;
      const lastTouch = dates[dates.length - 1]!;
      total += 1;

      const inRolling = dates.filter(
        (d) => d >= rollingStart && d <= to,
      ).length;
      if (inRolling >= 2) regular += 1;

      if (firstTouch >= from && firstTouch <= to) newInPeriod += 1;

      if (lastTouch < rollingStart) inactive += 1;
    }

    return {
      total,
      regular,
      newInPeriod,
      inactive,
    };
  }

  private async computeClientTotal(studioId: string): Promise<number> {
    const [bookingUsers, enrollmentUsers] = await Promise.all([
      this.prisma.sessionBooking.findMany({
        where: {
          studioId,
          status: { not: BookingStatus.CANCELED },
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.sessionEnrollment.findMany({
        where: {
          TrainingSession: { studioId },
        },
        select: { userId: true, status: true },
      }),
    ]);
    const unique = new Set<string>();
    for (const row of bookingUsers) unique.add(row.userId);
    for (const row of enrollmentUsers) {
      const status = String(row.status);
      if (status === 'ACTIVE' || status === 'NO_SHOW' || status === 'NOSHOW') {
        unique.add(row.userId);
      }
    }
    return unique.size;
  }
}
