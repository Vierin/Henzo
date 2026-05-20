import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SessionEnrollmentStatus,
  StudioClientSource,
  UserRole,
} from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../email/email.service';
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

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

@Injectable()
export class StudioClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
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

  private async getOwnerStudioId(authHeader: string): Promise<string> {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    if (currentUser.user.role !== 'OWNER') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const studio = await this.prisma.studio.findFirst({
      where: { ownerId: currentUser.user.id },
      select: { id: true },
    });
    if (!studio) {
      throw new HttpException('Studio not found', HttpStatus.NOT_FOUND);
    }
    return studio.id;
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
    const studioId = await this.getOwnerStudioId(authHeader);
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
    const studioId = await this.getOwnerStudioId(authHeader);
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

  async createSessionInvite(
    authHeader: string,
    body: {
      email: string;
      sessionId: string;
      expiresInDays?: number;
    },
  ): Promise<{ success: true; invitationId: string }> {
    const studioId = await this.getOwnerStudioId(authHeader);
    const currentUser = await this.authService.getCurrentUser(authHeader);
    const email = normalizeEmail(body.email);
    if (!email || !isDeliverableClientEmail(email)) {
      throw new HttpException(
        'valid email is required for invite',
        HttpStatus.BAD_REQUEST,
      );
    }
    const session = await this.prisma.trainingSession.findFirst({
      where: { id: body.sessionId, studioId },
      select: { id: true },
    });
    if (!session) {
      throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    }
    const days = Math.min(Math.max(1, body.expiresInDays ?? 7), 30);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = sha256Hex(rawToken);
    const inv = await this.prisma.clientInvitation.create({
      data: {
        studioId,
        email,
        tokenHash,
        expiresAt,
        sessionId: session.id,
        createdByUserId: currentUser.user.id,
      },
      select: { id: true },
    });
    await this.sendInvitationEmail({
      email,
      rawToken,
      invitationId: inv.id,
    });
    return { success: true, invitationId: inv.id };
  }

  private inviteLandingUrl(rawToken: string): string {
    const apiBase =
      this.configService.get<string>('PUBLIC_API_BASE_URL')?.trim() ||
      this.configService.get<string>('API_PUBLIC_URL')?.trim() ||
      '';
    if (apiBase) {
      const base = apiBase.replace(/\/$/, '');
      return `${base}/fitness/public/client-invitations/landing?token=${encodeURIComponent(rawToken)}`;
    }
    const front =
      this.configService.get<string>('FRONTEND_URL')?.trim() ||
      'https://henzo.app';
    return `${front.replace(/\/$/, '')}/client-invite?token=${encodeURIComponent(rawToken)}`;
  }

  private async sendInvitationEmail(input: {
    email: string;
    rawToken: string;
    invitationId: string;
  }): Promise<void> {
    const url = this.inviteLandingUrl(input.rawToken);
    const subject = 'Henzo — invitation to your class';
    const appLink = `henzo://client-invite?token=${encodeURIComponent(input.rawToken)}`;
    const htmlBody = [
      '<p>You have been invited to a class on Henzo.</p>',
      `<p><a href="${url}">Open invitation (web)</a></p>`,
      `<p>If you have the Henzo app: <code>${appLink}</code></p>`,
      `<p style="color:#666;font-size:12px;">Web link:<br/>${url}</p>`,
    ].join('');
    try {
      await this.emailService.sendEmail({
        to: input.email,
        subject,
        html: htmlBody,
      });
    } catch (e) {
      console.error('Failed to send client invitation email:', e);
      throw new HttpException(
        'Failed to send invitation email',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async confirmInvitationByToken(rawToken: string) {
    const tokenHash = sha256Hex(rawToken.trim());
    const inv = await this.prisma.clientInvitation.findUnique({
      where: { tokenHash },
      include: {
        TrainingSession: {
          select: {
            id: true,
            studioId: true,
            capacity: true,
            bookedCount: true,
            status: true,
          },
        },
      },
    });
    if (!inv) {
      throw new HttpException('Invalid token', HttpStatus.NOT_FOUND);
    }
    if (inv.consumedAt) {
      return {
        success: true,
        alreadyUsed: true,
        email: inv.email,
      };
    }
    if (inv.expiresAt < new Date()) {
      throw new HttpException('Invitation expired', HttpStatus.GONE);
    }

    const user = await this.findOrCreateClientUser({
      name: null,
      email: inv.email,
      phone: null,
    });

    await this.ensureStudioClient(
      inv.studioId,
      user.id,
      StudioClientSource.INVITE,
    );

    let enrolled = false;
    if (inv.sessionId && inv.TrainingSession) {
      const session = inv.TrainingSession;
      if (session.status !== 'CANCELLED') {
        const existing = await this.prisma.sessionEnrollment.findFirst({
          where: { sessionId: session.id, userId: user.id },
          select: { id: true, status: true },
        });
        if (
          !existing &&
          (session.bookedCount ?? 0) >= (session.capacity ?? 1)
        ) {
          throw new HttpException('No spots left', HttpStatus.BAD_REQUEST);
        }
        if (existing?.status === SessionEnrollmentStatus.ACTIVE) {
          enrolled = true;
        } else {
          await this.prisma.$transaction(async (tx) => {
            if (existing) {
              await tx.sessionEnrollment.update({
                where: { id: existing.id },
                data: {
                  status: SessionEnrollmentStatus.ACTIVE,
                  cancelledAt: null,
                },
              });
              if (existing.status === SessionEnrollmentStatus.CANCELLED) {
                await tx.trainingSession.update({
                  where: { id: session.id },
                  data: { bookedCount: { increment: 1 } },
                });
              }
            } else {
              await tx.sessionEnrollment.create({
                data: {
                  sessionId: session.id,
                  userId: user.id,
                  status: SessionEnrollmentStatus.ACTIVE,
                },
              });
              await tx.trainingSession.update({
                where: { id: session.id },
                data: { bookedCount: { increment: 1 } },
              });
            }
          });
          enrolled = true;
        }
      }
    }

    await this.prisma.clientInvitation.update({
      where: { id: inv.id },
      data: { consumedAt: new Date() },
    });

    return {
      success: true,
      email: inv.email,
      userId: user.id,
      enrolled,
    };
  }

  async getInvitationLandingContext(rawToken: string) {
    try {
      const tokenHash = sha256Hex(rawToken.trim());
      const inv = await this.prisma.clientInvitation.findUnique({
        where: { tokenHash },
        select: {
          email: true,
          expiresAt: true,
          consumedAt: true,
          sessionId: true,
          Studio: { select: { name: true } },
          TrainingSession: {
            select: {
              startsAt: true,
              Training: { select: { name: true } },
            },
          },
        },
      });
      if (!inv) {
        return { valid: false as const, reason: 'invalid' as const };
      }
      if (inv.consumedAt) {
        return { valid: false as const, reason: 'used' as const };
      }
      if (inv.expiresAt < new Date()) {
        return { valid: false as const, reason: 'expired' as const };
      }
      return {
        valid: true as const,
        salonName: inv.Studio.name,
        trainingName: inv.TrainingSession?.Training?.name ?? null,
        startsAt: inv.TrainingSession?.startsAt?.toISOString() ?? null,
        email: inv.email,
      };
    } catch {
      return { valid: false as const, reason: 'invalid' as const };
    }
  }
}
