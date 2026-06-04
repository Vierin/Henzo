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

  private async loadBlockSets(studioId: string) {
    const rows = await this.prisma.studioClientBlock.findMany({
      where: { studioId },
      select: { userId: true, email: true, phone: true },
    });
    return {
      userIds: new Set(
        rows.map((r) => r.userId).filter((id): id is string => !!id),
      ),
      emails: new Set(
        rows
          .map((r) => r.email?.trim().toLowerCase())
          .filter((e): e is string => !!e),
      ),
      phones: new Set(
        rows.map((r) => r.phone?.trim()).filter((p): p is string => !!p),
      ),
    };
  }

  private isBlockedUser(
    user: { id: string; email: string; phone: string | null },
    blocks: {
      userIds: Set<string>;
      emails: Set<string>;
      phones: Set<string>;
    },
  ): boolean {
    if (blocks.userIds.has(user.id)) return true;
    const email = user.email?.trim().toLowerCase();
    if (email && blocks.emails.has(email)) return true;
    const phone = user.phone?.trim();
    if (phone && blocks.phones.has(phone)) return true;
    return false;
  }

  async searchStudioClients(authHeader: string, q: string) {
    const studioId = await this.tryGetOwnerStudioId(authHeader);
    if (!studioId) return [];
    const term = q.trim();
    if (term.length < 2) {
      return [];
    }
    const lower = term.toLowerCase();
    const blocks = await this.loadBlockSets(studioId);

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { email: { contains: lower, mode: 'insensitive' } },
              { phone: { contains: term } },
              { name: { contains: term, mode: 'insensitive' } },
            ],
          },
          {
            OR: [
              { Booking: { some: { studioId } } },
              {
                SessionEnrollment: {
                  some: {
                    status: { not: SessionEnrollmentStatus.CANCELLED },
                    TrainingSession: { studioId },
                  },
                },
              },
              { StudioClients: { some: { studioId } } },
            ],
          },
        ],
      },
      take: 30,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isGuest: true,
        StudioClients: {
          where: { studioId },
          take: 1,
          select: { id: true, source: true, notes: true },
        },
      },
    });

    return users
      .filter((u) => !this.isBlockedUser(u, blocks))
      .filter((u) => isDeliverableClientEmail(u.email))
      .slice(0, 20)
      .map((u) => {
        const sc = u.StudioClients[0];
        return {
          studioClientId: sc?.id ?? null,
          userId: u.id,
          source: sc?.source ?? null,
          notes: sc?.notes ?? null,
          name: u.name,
          email: u.email,
          phone: u.phone,
          isGuest: u.isGuest,
        };
      });
  }

  async listMergedStudioClients(authHeader: string) {
    const studioId = await this.tryGetOwnerStudioId(authHeader);
    if (!studioId) return [];
    const blocks = await this.loadBlockSets(studioId);

    type Agg = {
      visitsCount: number;
      lastVisit: Date;
      studioClientId: string | null;
      source: StudioClientSource | null;
      notes: string | null;
      rosterCreatedAt: Date | null;
    };

    const agg = new Map<string, Agg>();

    const bump = (userId: string, at: Date) => {
      const prev = agg.get(userId);
      if (!prev) {
        agg.set(userId, {
          visitsCount: 1,
          lastVisit: at,
          studioClientId: null,
          source: null,
          notes: null,
          rosterCreatedAt: null,
        });
        return;
      }
      prev.visitsCount += 1;
      if (at > prev.lastVisit) prev.lastVisit = at;
    };

    const [bookingRows, enrollmentRows, roster] = await Promise.all([
      this.prisma.sessionBooking.findMany({
        where: { studioId },
        select: { userId: true, startsAt: true },
      }),
      this.prisma.sessionEnrollment.findMany({
        where: {
          status: { not: SessionEnrollmentStatus.CANCELLED },
          TrainingSession: { studioId },
        },
        select: {
          userId: true,
          TrainingSession: { select: { startsAt: true } },
        },
      }),
      this.prisma.studioClient.findMany({
        where: { studioId },
        select: {
          id: true,
          userId: true,
          source: true,
          notes: true,
          createdAt: true,
        },
      }),
    ]);

    for (const b of bookingRows) {
      bump(b.userId, b.startsAt);
    }
    for (const e of enrollmentRows) {
      bump(e.userId, e.TrainingSession.startsAt);
    }
    for (const r of roster) {
      const prev = agg.get(r.userId);
      if (!prev) {
        agg.set(r.userId, {
          visitsCount: 0,
          lastVisit: r.createdAt,
          studioClientId: r.id,
          source: r.source,
          notes: r.notes,
          rosterCreatedAt: r.createdAt,
        });
      } else {
        prev.studioClientId = r.id;
        prev.source = r.source;
        prev.notes = r.notes;
        prev.rosterCreatedAt = r.createdAt;
        if (r.createdAt > prev.lastVisit) {
          prev.lastVisit = r.createdAt;
        }
      }
    }

    const userIds = [...agg.keys()];
    if (userIds.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isGuest: true,
      },
    });

    const byId = new Map(users.map((u) => [u.id, u]));

    return userIds
      .map((userId) => {
        const user = byId.get(userId);
        const a = agg.get(userId)!;
        if (!user || this.isBlockedUser(user, blocks)) return null;
        if (!isDeliverableClientEmail(user.email)) return null;
        return {
          studioClientId: a.studioClientId,
          userId,
          source: a.source,
          notes: a.notes,
          rosterCreatedAt: a.rosterCreatedAt?.toISOString() ?? null,
          name: user.name,
          email: user.email,
          phone: user.phone,
          isGuest: user.isGuest,
          lastVisit: a.lastVisit.toISOString(),
          visitsCount: a.visitsCount,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort(
        (a, b) =>
          new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime(),
      );
  }
}
