import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AuthService } from '../auth/auth.service';
import { NotificationsService } from '../notifications/notifications.service';
import { renderStudioClaimBookingHtml } from '../email/templates/transactional-email-templates';
import { STUDIO_CLAIM_EMAIL_STRINGS } from '../email/copy/studio-claim-email.strings';
import { resolveClientEmailLocale } from '../email/copy/client-email-locale';

const CLAIM_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

@Injectable()
export class StudioClaimService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly authService: AuthService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private generateRawToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private normalizeEmail(email: string): string {
    return (email || '').trim().toLowerCase();
  }

  private maskEmail(email: string): string {
    const normalized = this.normalizeEmail(email);
    const [local, domain] = normalized.split('@');
    if (!local || !domain) return '***';
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}***@${domain}`;
  }

  private claimWebUrl(rawToken: string, action: 'manage' | 'confirm'): string {
    let webUrl = (process.env.FRONTEND_URL || 'https://www.henzo.app').replace(
      /\/$/,
      '',
    );
    // Android App Links autoVerify only for www.henzo.app (apex redirects break it).
    if (
      webUrl === 'https://henzo.app' ||
      webUrl.startsWith('https://henzo.app/')
    ) {
      webUrl = webUrl.replace('https://henzo.app', 'https://www.henzo.app');
    }
    return `${webUrl}/studio-claim/${rawToken}?action=${action}`;
  }

  private async findPendingByHash(tokenHash: string) {
    return this.prisma.studioClaimToken.findUnique({
      where: { tokenHash },
      include: {
        Studio: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            ownerId: true,
            intendedOwnerEmail: true,
            claimedAt: true,
          },
        },
      },
    });
  }

  private assertClaimUsable(claim: {
    status: string;
    expiresAt: Date;
    Studio: { claimedAt: Date | null } | null;
  }) {
    if (!claim) {
      throw new HttpException('Claim not found', HttpStatus.NOT_FOUND);
    }
    if (claim.status === 'ACCEPTED' || claim.Studio?.claimedAt) {
      throw new HttpException('Studio already claimed', HttpStatus.GONE);
    }
    if (claim.status === 'REVOKED') {
      throw new HttpException('Claim revoked', HttpStatus.GONE);
    }
    if (claim.expiresAt < new Date() || claim.status === 'EXPIRED') {
      throw new HttpException('Claim expired', HttpStatus.GONE);
    }
  }

  /**
   * Creates/refreshes a pending claim token for a studio.
   * Called by ops/owner or auto on first booking for unclaimed studios.
   */
  async requestClaim(
    studioId: string,
    ownerEmail: string,
    options?: {
      createdBy?: string;
      sendEmail?: boolean;
      bookingMeta?: {
        enrollmentId?: string;
        sessionId?: string;
        trainingName?: string;
        clientName?: string;
        startsAt?: string;
      };
      requireOwnership?: { userId: string };
    },
  ) {
    const email = this.normalizeEmail(ownerEmail);
    if (!email || !email.includes('@')) {
      throw new HttpException('Invalid owner email', HttpStatus.BAD_REQUEST);
    }

    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        claimedAt: true,
        intendedOwnerEmail: true,
      },
    });
    if (!studio) {
      throw new HttpException('Studio not found', HttpStatus.NOT_FOUND);
    }
    if (studio.claimedAt) {
      throw new HttpException('Studio already claimed', HttpStatus.CONFLICT);
    }
    if (
      options?.requireOwnership &&
      studio.ownerId !== options.requireOwnership.userId
    ) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    await this.prisma.studioClaimToken.updateMany({
      where: { studioId, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });

    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + CLAIM_TTL_MS);

    const claim = await this.prisma.studioClaimToken.create({
      data: {
        studioId,
        ownerEmail: email,
        tokenHash,
        status: 'PENDING',
        expiresAt,
        createdBy: options?.createdBy ?? null,
        metadata: options?.bookingMeta ?? undefined,
      },
    });

    await this.prisma.studio.update({
      where: { id: studioId },
      data: { intendedOwnerEmail: email },
    });

    const manageUrl = this.claimWebUrl(rawToken, 'manage');
    const confirmUrl = this.claimWebUrl(rawToken, 'confirm');

    if (options?.sendEmail !== false) {
      await this.sendClaimBookingEmail({
        to: email,
        studioName: studio.name,
        manageUrl,
        confirmUrl,
        bookingMeta: options?.bookingMeta,
      });
    }

    return {
      success: true,
      claimId: claim.id,
      manageUrl,
      confirmUrl,
      expiresAt: expiresAt.toISOString(),
      // raw token only returned to authenticated ops callers for testing
      token: options?.createdBy ? rawToken : undefined,
    };
  }

  async sendClaimBookingEmail(params: {
    to: string;
    studioName: string;
    manageUrl: string;
    confirmUrl: string;
    bookingMeta?: {
      trainingName?: string;
      clientName?: string;
      startsAt?: string;
    };
  }) {
    const loc = resolveClientEmailLocale();
    const L = STUDIO_CLAIM_EMAIL_STRINGS[loc];
    const subject = L.subject
      .replace('{studioName}', params.studioName)
      .replace(
        '{trainingName}',
        params.bookingMeta?.trainingName || L.defaultTrainingName,
      );

    await this.emailService.sendEmail({
      to: params.to,
      subject,
      html: renderStudioClaimBookingHtml({
        studioName: params.studioName,
        manageUrl: params.manageUrl,
        confirmUrl: params.confirmUrl,
        trainingName: params.bookingMeta?.trainingName,
        clientName: params.bookingMeta?.clientName,
        startsAt: params.bookingMeta?.startsAt,
        locale: loc,
      }),
      fromName: 'Henzo',
    });
  }

  /**
   * On new booking: if studio still unclaimed and has intended owner email,
   * refresh claim token and email the owner.
   */
  async notifyOnBookingIfUnclaimed(
    studioId: string,
    bookingMeta: {
      enrollmentId?: string;
      sessionId?: string;
      trainingName?: string;
      clientName?: string;
      startsAt?: Date | string;
    },
  ): Promise<void> {
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: {
        id: true,
        claimedAt: true,
        intendedOwnerEmail: true,
        email: true,
      },
    });
    if (!studio || studio.claimedAt) return;

    const ownerEmail =
      this.normalizeEmail(studio.intendedOwnerEmail || '') ||
      this.normalizeEmail(studio.email || '');
    if (!ownerEmail) return;

    const startsAt =
      bookingMeta.startsAt instanceof Date
        ? bookingMeta.startsAt.toISOString()
        : bookingMeta.startsAt;

    await this.requestClaim(studioId, ownerEmail, {
      sendEmail: true,
      bookingMeta: {
        enrollmentId: bookingMeta.enrollmentId,
        sessionId: bookingMeta.sessionId,
        trainingName: bookingMeta.trainingName,
        clientName: bookingMeta.clientName,
        startsAt,
      },
    });
  }

  async getClaimPreview(rawToken: string) {
    const claim = await this.findPendingByHash(this.hashToken(rawToken));
    if (!claim) {
      throw new HttpException('Claim not found', HttpStatus.NOT_FOUND);
    }
    this.assertClaimUsable(claim);
    const meta = this.readBookingMeta(claim.metadata);
    return {
      studioId: claim.Studio?.id,
      studioName: claim.Studio?.name,
      studioLogoUrl: claim.Studio?.logoUrl,
      maskedEmail: this.maskEmail(claim.ownerEmail),
      ownerEmailHint: claim.ownerEmail,
      expiresAt: claim.expiresAt.toISOString(),
      actionDefault: 'manage',
      booking: meta,
    };
  }

  /**
   * Public: confirm the PENDING enrollment from claim email — no auth / no ownership transfer.
   */
  async confirmBookingViaToken(rawToken: string) {
    const claim = await this.findPendingByHash(this.hashToken(rawToken));
    if (!claim) {
      throw new HttpException('Claim not found', HttpStatus.NOT_FOUND);
    }

    const meta = this.readBookingMeta(claim.metadata);
    if (!meta.enrollmentId) {
      throw new HttpException(
        'No booking attached to this link',
        HttpStatus.BAD_REQUEST,
      );
    }

    const enrollment = await this.prisma.sessionEnrollment.findUnique({
      where: { id: meta.enrollmentId },
      select: { id: true, status: true },
    });
    if (!enrollment) {
      throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
    }

    const alreadyConfirmed = enrollment.status === 'ACTIVE';
    if (
      !alreadyConfirmed &&
      (claim.expiresAt < new Date() ||
        claim.status === 'EXPIRED' ||
        claim.status === 'REVOKED')
    ) {
      throw new HttpException('Claim expired', HttpStatus.GONE);
    }

    if (!alreadyConfirmed && enrollment.status !== 'PENDING') {
      throw new HttpException(
        'Booking cannot be confirmed',
        HttpStatus.CONFLICT,
      );
    }

    const confirmed = alreadyConfirmed
      ? true
      : await this.confirmEnrollmentFromClaimMetadata(claim.metadata);

    if (!confirmed) {
      throw new HttpException(
        'Failed to confirm booking',
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      success: true,
      alreadyConfirmed,
      studioId: claim.Studio?.id,
      studioName: claim.Studio?.name ?? null,
      studioLogoUrl: claim.Studio?.logoUrl ?? null,
      trainingName: meta.trainingName,
      clientName: meta.clientName,
      startsAt: meta.startsAt,
      enrollmentId: meta.enrollmentId,
      manageUrl: this.claimWebUrl(rawToken, 'manage'),
    };
  }

  private readBookingMeta(metadata: unknown): {
    enrollmentId?: string;
    sessionId?: string;
    trainingName?: string;
    clientName?: string;
    startsAt?: string;
  } {
    if (!metadata || typeof metadata !== 'object') return {};
    const m = metadata as Record<string, unknown>;
    const str = (v: unknown) =>
      typeof v === 'string' && v.trim() ? v.trim() : undefined;
    return {
      enrollmentId: str(m.enrollmentId),
      sessionId: str(m.sessionId),
      trainingName: str(m.trainingName),
      clientName: str(m.clientName),
      startsAt: str(m.startsAt),
    };
  }

  async lookupByEmail(email: string) {
    const normalized = this.normalizeEmail(email);
    if (!normalized) {
      return { hasUnclaimedStudio: false as const };
    }

    const claim = await this.prisma.studioClaimToken.findFirst({
      where: {
        ownerEmail: normalized,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
        Studio: { claimedAt: null },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        Studio: { select: { id: true, name: true, logoUrl: true } },
      },
    });

    if (!claim) {
      // Also check intendedOwnerEmail without active token
      const studio = await this.prisma.studio.findFirst({
        where: {
          intendedOwnerEmail: normalized,
          claimedAt: null,
        },
        select: { id: true, name: true, logoUrl: true },
        orderBy: { createdAt: 'desc' },
      });
      if (!studio) {
        return { hasUnclaimedStudio: false as const };
      }
      return {
        hasUnclaimedStudio: true as const,
        studioId: studio.id,
        studioName: studio.name,
        studioLogoUrl: studio.logoUrl,
      };
    }

    return {
      hasUnclaimedStudio: true as const,
      studioId: claim.Studio.id,
      studioName: claim.Studio.name,
      studioLogoUrl: claim.Studio.logoUrl,
    };
  }

  async acceptClaim(
    rawToken: string,
    userId: string,
    userEmail?: string | null,
    options?: { confirmBooking?: boolean },
  ) {
    const claim = await this.findPendingByHash(this.hashToken(rawToken));
    if (!claim) {
      throw new HttpException('Claim not found', HttpStatus.NOT_FOUND);
    }

    // Idempotent: same user already owns the studio
    if (
      (claim.status === 'ACCEPTED' || claim.Studio?.claimedAt) &&
      claim.Studio?.ownerId === userId
    ) {
      const enrollmentConfirmed = options?.confirmBooking
        ? await this.confirmEnrollmentFromClaimMetadata(claim.metadata)
        : false;
      return {
        success: true,
        alreadyClaimed: true,
        studioId: claim.studioId,
        enrollmentConfirmed,
      };
    }

    this.assertClaimUsable(claim);

    const claimEmail = this.normalizeEmail(claim.ownerEmail);
    const acceptorEmail = this.normalizeEmail(userEmail || '');
    if (!acceptorEmail || claimEmail !== acceptorEmail) {
      throw new HttpException(
        'Claim email does not match your account',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.transferOwnership(claim.id, claim.studioId, userId, claimEmail);
    const enrollmentConfirmed = options?.confirmBooking
      ? await this.confirmEnrollmentFromClaimMetadata(claim.metadata)
      : false;

    return {
      success: true,
      alreadyClaimed: false,
      studioId: claim.studioId,
      enrollmentConfirmed,
    };
  }

  /** Accept any pending claim for the authenticated user's email. */
  async acceptPendingForUser(userId: string, userEmail?: string | null) {
    const email = this.normalizeEmail(userEmail || '');
    if (!email) {
      throw new HttpException('Email required', HttpStatus.BAD_REQUEST);
    }

    const claim = await this.prisma.studioClaimToken.findFirst({
      where: {
        ownerEmail: email,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
        Studio: { claimedAt: null },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        Studio: {
          select: {
            id: true,
            ownerId: true,
            claimedAt: true,
          },
        },
      },
    });

    if (!claim) {
      return { success: false, claimed: false };
    }

    if (claim.Studio.ownerId === userId && claim.Studio.claimedAt) {
      return { success: true, claimed: true, studioId: claim.studioId };
    }

    await this.transferOwnership(claim.id, claim.studioId, userId, email);
    return { success: true, claimed: true, studioId: claim.studioId };
  }

  /**
   * Public: email + password + claim token.
   * Creates OWNER account if missing, otherwise signs in, then transfers ownership.
   */
  async completeWithPassword(
    rawToken: string,
    email: string,
    password: string,
    options?: { confirmBooking?: boolean },
  ) {
    const normalized = this.normalizeEmail(email);
    if (!normalized || !password || password.length < 6) {
      throw new HttpException(
        'Valid email and password (min 6) required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const claim = await this.findPendingByHash(this.hashToken(rawToken));
    if (!claim) {
      throw new HttpException('Claim not found', HttpStatus.NOT_FOUND);
    }
    this.assertClaimUsable(claim);

    if (this.normalizeEmail(claim.ownerEmail) !== normalized) {
      throw new HttpException(
        'Claim email does not match',
        HttpStatus.FORBIDDEN,
      );
    }

    const result = await this.authService.ensureOwnerAccountWithPassword({
      email: normalized,
      password,
      name: claim.Studio?.name
        ? `${claim.Studio.name} owner`
        : normalized.split('@')[0],
    });

    await this.transferOwnership(
      claim.id,
      claim.studioId,
      result.user.id,
      normalized,
    );

    const enrollmentConfirmed = options?.confirmBooking
      ? await this.confirmEnrollmentFromClaimMetadata(claim.metadata)
      : false;

    return {
      success: true,
      studioId: claim.studioId,
      user: result.user,
      session: result.session,
      enrollmentConfirmed,
    };
  }

  /**
   * Activate PENDING enrollment referenced in claim token metadata.
   * Seat was already held at booking time — no bookedCount change.
   */
  private async confirmEnrollmentFromClaimMetadata(
    metadata: unknown,
  ): Promise<boolean> {
    const enrollmentId =
      metadata &&
      typeof metadata === 'object' &&
      'enrollmentId' in metadata &&
      typeof (metadata as { enrollmentId?: unknown }).enrollmentId === 'string'
        ? (metadata as { enrollmentId: string }).enrollmentId.trim()
        : '';
    if (!enrollmentId) return false;

    const row = await this.prisma.sessionEnrollment.findUnique({
      where: { id: enrollmentId },
      select: { id: true, status: true, userId: true },
    });
    if (!row) return false;
    if (row.status === 'ACTIVE') return true;
    if (row.status !== 'PENDING') return false;

    await this.prisma.sessionEnrollment.update({
      where: { id: enrollmentId },
      data: { status: 'ACTIVE', cancelledAt: null },
    });

    try {
      await this.notificationsService.schedulePreClassReminders(
        enrollmentId,
        row.userId,
      );
    } catch (e) {
      console.error('⚠️ Failed to schedule reminders after claim confirm:', e);
    }

    return true;
  }

  private async transferOwnership(
    claimId: string,
    studioId: string,
    newOwnerId: string,
    ownerEmail: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const studio = await tx.studio.findUnique({
        where: { id: studioId },
        select: { id: true, ownerId: true, claimedAt: true },
      });
      if (!studio) {
        throw new HttpException('Studio not found', HttpStatus.NOT_FOUND);
      }
      if (studio.claimedAt && studio.ownerId !== newOwnerId) {
        throw new HttpException('Studio already claimed', HttpStatus.CONFLICT);
      }

      await tx.studio.update({
        where: { id: studioId },
        data: {
          ownerId: newOwnerId,
          intendedOwnerEmail: ownerEmail,
          claimedAt: new Date(),
        },
      });

      await tx.studioClaimToken.update({
        where: { id: claimId },
        data: {
          status: 'ACCEPTED',
          claimedAt: new Date(),
          claimedByUserId: newOwnerId,
        },
      });

      await tx.studioClaimToken.updateMany({
        where: {
          studioId,
          status: 'PENDING',
          id: { not: claimId },
        },
        data: { status: 'REVOKED' },
      });

      // Ensure claimer is OWNER in our DB
      await tx.user.update({
        where: { id: newOwnerId },
        data: { role: 'OWNER' },
      });
    });

    await this.authService.syncUserRoleMetadata(newOwnerId, 'OWNER');
  }
}
