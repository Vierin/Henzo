import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ActivityTier =
  | 'active'
  | 'warming'
  | 'sleeping'
  | 'never_used'
  | 'draft';

export type StudioActivityMetrics = {
  lastActivityAt: string | null;
  activityTier: ActivityTier;
  bookingsTotal: number;
  bookingsLast30d: number;
  sessionsTotal: number;
  sessionsLast30d: number;
  clientsCount: number;
};

export type WeeklyActivityBucket = {
  weekStart: string;
  bookings: number;
  sessions: number;
};

const MS_7D = 7 * 24 * 60 * 60 * 1000;
const MS_30D = 30 * 24 * 60 * 60 * 1000;
const MS_90D = 90 * 24 * 60 * 60 * 1000;
const EPOCH = new Date(0);

@Injectable()
export class AdminOwnerActivityService {
  constructor(private readonly prisma: PrismaService) {}

  computeTier(
    lastActivityAt: Date | null,
    studioStatus: string,
    hasAnyActivity: boolean,
  ): ActivityTier {
    if (studioStatus === 'DRAFT' || studioStatus === 'READY') {
      return 'draft';
    }
    if (!hasAnyActivity || !lastActivityAt || lastActivityAt.getTime() <= 0) {
      return 'never_used';
    }
    const age = Date.now() - lastActivityAt.getTime();
    if (age <= MS_7D) return 'active';
    if (age <= MS_30D) return 'warming';
    return 'sleeping';
  }

  async getMetricsForStudios(
    studioRows: Array<{ id: string; status: string }>,
  ): Promise<Map<string, StudioActivityMetrics>> {
    const studioIds = studioRows.map((s) => s.id);
    const result = new Map<string, StudioActivityMetrics>();
    if (studioIds.length === 0) return result;

    const d30 = new Date(Date.now() - MS_30D);

    const [
      bookingAgg,
      sessionAgg,
      enrollmentAgg,
      bookings30d,
      sessions30d,
      clientsAgg,
    ] = await Promise.all([
      this.prisma.sessionBooking.groupBy({
        by: ['studioId'],
        where: { studioId: { in: studioIds } },
        _max: { createdAt: true },
        _count: { _all: true },
      }),
      this.prisma.trainingSession.groupBy({
        by: ['studioId'],
        where: { studioId: { in: studioIds } },
        _max: { createdAt: true, updatedAt: true },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<
        Array<{ studioId: string; maxCreated: Date | null; cnt: bigint }>
      >`
          SELECT ts."studioId" AS "studioId",
                 MAX(se."createdAt") AS "maxCreated",
                 COUNT(*)::bigint AS cnt
          FROM "SessionEnrollment" se
          INNER JOIN "TrainingSession" ts ON se."sessionId" = ts.id
          WHERE ts."studioId" = ANY(${studioIds}::text[])
          GROUP BY ts."studioId"
        `,
      this.prisma.sessionBooking.groupBy({
        by: ['studioId'],
        where: { studioId: { in: studioIds }, createdAt: { gte: d30 } },
        _count: { _all: true },
      }),
      this.prisma.trainingSession.groupBy({
        by: ['studioId'],
        where: { studioId: { in: studioIds }, createdAt: { gte: d30 } },
        _count: { _all: true },
      }),
      this.prisma.studioClient.groupBy({
        by: ['studioId'],
        where: { studioId: { in: studioIds } },
        _count: { _all: true },
      }),
    ]);

    const bookingByStudio = new Map(
      bookingAgg.map((r) => [
        r.studioId,
        { max: r._max.createdAt, count: r._count._all },
      ]),
    );
    const sessionByStudio = new Map(
      sessionAgg.map((r) => [
        r.studioId,
        {
          maxCreated: r._max.createdAt,
          maxUpdated: r._max.updatedAt,
          count: r._count._all,
        },
      ]),
    );
    const enrollmentByStudio = new Map(
      enrollmentAgg.map((r) => [
        r.studioId,
        { max: r.maxCreated, count: Number(r.cnt) },
      ]),
    );
    const bookings30dByStudio = new Map(
      bookings30d.map((r) => [r.studioId, r._count._all]),
    );
    const sessions30dByStudio = new Map(
      sessions30d.map((r) => [r.studioId, r._count._all]),
    );
    const clientsByStudio = new Map(
      clientsAgg.map((r) => [r.studioId, r._count._all]),
    );

    for (const studio of studioRows) {
      const b = bookingByStudio.get(studio.id);
      const s = sessionByStudio.get(studio.id);
      const e = enrollmentByStudio.get(studio.id);

      const dates: Date[] = [];
      if (b?.max) dates.push(b.max);
      if (s?.maxCreated) dates.push(s.maxCreated);
      if (s?.maxUpdated) dates.push(s.maxUpdated);
      if (e?.max) dates.push(e.max);

      const lastActivityAt =
        dates.length > 0
          ? new Date(Math.max(...dates.map((d) => d.getTime())))
          : null;

      const bookingsTotal = b?.count ?? 0;
      const sessionsTotal = s?.count ?? 0;
      const enrollmentsTotal = e?.count ?? 0;
      const hasAnyActivity =
        bookingsTotal + sessionsTotal + enrollmentsTotal > 0;

      result.set(studio.id, {
        lastActivityAt: lastActivityAt?.toISOString() ?? null,
        activityTier: this.computeTier(
          lastActivityAt ?? EPOCH,
          studio.status,
          hasAnyActivity,
        ),
        bookingsTotal,
        bookingsLast30d: bookings30dByStudio.get(studio.id) ?? 0,
        sessionsTotal,
        sessionsLast30d: sessions30dByStudio.get(studio.id) ?? 0,
        clientsCount: clientsByStudio.get(studio.id) ?? 0,
      });
    }

    return result;
  }

  async countTierSummary(): Promise<{
    ownersActive7d: number;
    ownersWarming30d: number;
    ownersSleeping30d: number;
    ownersNeverUsed: number;
    publishedStudios: number;
  }> {
    const studios = await this.prisma.studio.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, status: true },
    });
    const metrics = await this.getMetricsForStudios(studios);

    let ownersActive7d = 0;
    let ownersWarming30d = 0;
    let ownersSleeping30d = 0;
    let ownersNeverUsed = 0;

    for (const m of metrics.values()) {
      switch (m.activityTier) {
        case 'active':
          ownersActive7d += 1;
          break;
        case 'warming':
          ownersWarming30d += 1;
          break;
        case 'sleeping':
          ownersSleeping30d += 1;
          break;
        case 'never_used':
          ownersNeverUsed += 1;
          break;
      }
    }

    return {
      ownersActive7d,
      ownersWarming30d,
      ownersSleeping30d,
      ownersNeverUsed,
      publishedStudios: studios.length,
    };
  }

  async getPlatformActivityStats(): Promise<{
    bookingsLast7d: number;
    newStudiosLast30d: number;
  }> {
    const d7 = new Date(Date.now() - MS_7D);
    const d30 = new Date(Date.now() - MS_30D);
    const [bookingsLast7d, newStudiosLast30d] = await Promise.all([
      this.prisma.sessionBooking.count({
        where: {
          createdAt: { gte: d7 },
          status: { not: 'CANCELED' },
        },
      }),
      this.prisma.studio.count({
        where: { createdAt: { gte: d30 } },
      }),
    ]);
    return { bookingsLast7d, newStudiosLast30d };
  }

  private weekStartKey(d: Date): string {
    const copy = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
    const day = copy.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setUTCDate(copy.getUTCDate() + diff);
    return copy.toISOString().slice(0, 10);
  }

  async getStudioActivityTimeline(
    studioId: string,
  ): Promise<WeeklyActivityBucket[]> {
    const start = new Date(Date.now() - MS_90D);
    const [bookings, sessions] = await Promise.all([
      this.prisma.sessionBooking.findMany({
        where: { studioId, createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      this.prisma.trainingSession.findMany({
        where: { studioId, createdAt: { gte: start } },
        select: { createdAt: true },
      }),
    ]);

    const buckets = new Map<string, { bookings: number; sessions: number }>();

    for (const b of bookings) {
      const key = this.weekStartKey(b.createdAt);
      const row = buckets.get(key) ?? { bookings: 0, sessions: 0 };
      row.bookings += 1;
      buckets.set(key, row);
    }
    for (const s of sessions) {
      const key = this.weekStartKey(s.createdAt);
      const row = buckets.get(key) ?? { bookings: 0, sessions: 0 };
      row.sessions += 1;
      buckets.set(key, row);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, counts]) => ({
        weekStart,
        bookings: counts.bookings,
        sessions: counts.sessions,
      }));
  }
}
