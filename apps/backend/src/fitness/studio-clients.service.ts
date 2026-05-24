import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  SessionEnrollmentStatus,
  StudioClientSource,
  UserRole,
} from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

const HENZO_LOCAL = '@henzo.local';

function normalizeEmail(raw: string | undefined | null): string | null {
  const e = raw?.trim().toLowerCase();
  return e && e.length > 0 ? e : null;
}

/** Exported for owner enrollment email checks. */
export function isDeliverableClientEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  return !email.endsWith(HENZO_LOCAL);
}

@Injectable()
export class StudioClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async ensureStudioClient(
    studioId: string,
    userId: string,
    source: StudioClientSource,
    notes?: string | null,
  ): Promise<void> {
    await this.prisma.studioClient.upsert({
      where: {
        studioId_userId: { studioId, userId },
      },
      create: {
        studioId,
        userId,
        source,
        notes: notes?.trim() || null,
      },
      update: {
        updatedAt: new Date(),
        ...(source === StudioClientSource.ENROLLMENT
          ? {}
          : {
              source,
              notes: notes?.trim() ?? undefined,
            }),
      },
    });
  }

  /** Null when owner has not created a studio yet (setup flow). */
  private async tryGetOwnerStudioId(
    authHeader: string,
  ): Promise<string | null> {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    if (currentUser.user.role !== 'OWNER') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const studio = await this.prisma.studio.findFirst({
      where: { ownerId: currentUser.user.id },
      select: { id: true },
    });
    return studio?.id ?? null;
  }

  private async getOwnerStudioId(authHeader: string): Promise<string> {
    const studioId = await this.tryGetOwnerStudioId(authHeader);
    if (!studioId) {
      throw new HttpException('Studio not found', HttpStatus.NOT_FOUND);
    }
    return studioId;
  }

  /**
   * Same resolution rules as owner session enrollment: find by email, then
   * phone, else create guest User.
   */
  async findOrCreateClientUser(input: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  }): Promise<{ id: string }> {
    const email = normalizeEmail(input.email);
    const phone = input.phone?.trim() || null;
    const name = input.name?.trim() || null;
    if (!email && !phone) {
      throw new HttpException(
        'email or phone is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    let user = email
      ? await this.prisma.user.findUnique({
          where: { email },
          select: { id: true },
        })
      : null;
    if (!user && phone) {
      user = await this.prisma.user.findFirst({
        where: { phone },
        select: { id: true },
      });
    }
    if (!user) {
      const generatedEmail =
        email ??
        `guest-${Date.now()}-${Math.floor(Math.random() * 100000)}${HENZO_LOCAL}`;
      user = await this.prisma.user.create({
        data: {
          email: generatedEmail,
          name,
          phone: phone ?? null,
          role: UserRole.CLIENT,
          isGuest: true,
        },
        select: { id: true },
      });
    }
    return user;
  }

  /** Placeholder user for a class spot with no contact data. */
  async createAnonymousSpotUser(): Promise<{ id: string }> {
    const email = `walkin-${Date.now()}-${Math.floor(Math.random() * 100000)}${HENZO_LOCAL}`;
    return this.prisma.user.create({
      data: {
        email,
        name: 'Walk-in',
        role: UserRole.CLIENT,
        isGuest: true,
      },
      select: { id: true },
    });
  }

  async createManualDirectoryClient(
    authHeader: string,
    body: { name?: string; email?: string; phone?: string; notes?: string },
  ): Promise<{ userId: string; studioClientId: string }> {
    const studioId = await this.getOwnerStudioId(authHeader);
    const name = body.name?.trim() || '';
    const email = normalizeEmail(body.email);
    if (name.length === 0 || !email) {
      throw new HttpException(
        'name and email are required',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpException('invalid email', HttpStatus.BAD_REQUEST);
    }
    const user = await this.findOrCreateClientUser({
      name,
      email,
      phone: body.phone?.trim() || null,
    });
    const row = await this.prisma.studioClient.upsert({
      where: { studioId_userId: { studioId, userId: user.id } },
      create: {
        studioId,
        userId: user.id,
        source: StudioClientSource.MANUAL,
        notes: body.notes?.trim() || null,
      },
      update: {
        notes: body.notes?.trim() ?? undefined,
      },
      select: { id: true },
    });
    return { userId: user.id, studioClientId: row.id };
  }

  async searchStudioClients(authHeader: string, q: string) {
    const studioId = await this.tryGetOwnerStudioId(authHeader);
    if (!studioId) return [];
    const term = q.trim();
    if (term.length < 2) {
      return [];
    }
    const lower = term.toLowerCase();
    const rows = await this.prisma.studioClient.findMany({
      where: {
        studioId,
        User: {
          OR: [
            { email: { contains: lower, mode: 'insensitive' } },
            { phone: { contains: term } },
            { name: { contains: term, mode: 'insensitive' } },
          ],
        },
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        userId: true,
        notes: true,
        source: true,
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
    });
    return rows.map((r) => ({
      studioClientId: r.id,
      userId: r.userId,
      source: r.source,
      notes: r.notes,
      name: r.User.name,
      email: r.User.email,
      phone: r.User.phone,
      isGuest: r.User.isGuest,
    }));
  }

  async listMergedStudioClients(authHeader: string) {
    const studioId = await this.tryGetOwnerStudioId(authHeader);
    if (!studioId) return [];
    const roster = await this.prisma.studioClient.findMany({
      where: { studioId },
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
      orderBy: { updatedAt: 'desc' },
    });
    const userIds = roster.map((r) => r.userId);
    if (userIds.length === 0) {
      return [];
    }

    const [bookingRows, enrollmentRows] = await Promise.all([
      this.prisma.sessionBooking.findMany({
        where: { studioId, userId: { in: userIds } },
        select: { userId: true, startsAt: true },
      }),
      this.prisma.sessionEnrollment.findMany({
        where: {
          userId: { in: userIds },
          status: { not: SessionEnrollmentStatus.CANCELLED },
          TrainingSession: { studioId },
        },
        select: {
          userId: true,
          TrainingSession: { select: { startsAt: true } },
        },
      }),
    ]);

    const lastByUser = new Map<string, Date>();
    const countByUser = new Map<string, number>();

    const bump = (userId: string, at: Date) => {
      countByUser.set(userId, (countByUser.get(userId) ?? 0) + 1);
      const prev = lastByUser.get(userId);
      if (!prev || at > prev) lastByUser.set(userId, at);
    };

    for (const b of bookingRows) {
      bump(b.userId, b.startsAt);
    }
    for (const e of enrollmentRows) {
      bump(e.userId, e.TrainingSession.startsAt);
    }

    return roster.map((r) => {
      const visitLast = lastByUser.get(r.userId);
      const rosterLast = r.createdAt;
      const lastVisit = new Date(
        Math.max(rosterLast.getTime(), visitLast?.getTime() ?? 0),
      );
      const visitsCount = countByUser.get(r.userId) ?? 0;
      return {
        studioClientId: r.id,
        userId: r.userId,
        source: r.source,
        notes: r.notes,
        rosterCreatedAt: r.createdAt.toISOString(),
        name: r.User.name,
        email: r.User.email,
        phone: r.User.phone,
        isGuest: r.User.isGuest,
        lastVisit: lastVisit.toISOString(),
        visitsCount,
      };
    });
  }
}
