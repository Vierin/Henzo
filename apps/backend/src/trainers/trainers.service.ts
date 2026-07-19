import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanLimitsService } from '../subscriptions/plan-limits.service';
import { EmailService } from '../email/email.service';
import { TRAINER_INVITE_EMAIL_STRINGS } from '../email/copy/trainer-invite-email.strings';
import { resolveClientEmailLocale } from '../email/copy/client-email-locale';
import { renderTrainerInviteHtml } from '../email/templates/transactional-email-templates';

@Injectable()
export class TrainersService {
  constructor(
    private prisma: PrismaService,
    private planLimits: PlanLimitsService,
    private emailService: EmailService,
  ) {}

  async isStudioOwnedByOwner(studioId: string, ownerId: string) {
    const studio = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: { ownerId: true },
    });
    return studio?.ownerId === ownerId;
  }

  async findTrainerStudioId(id: string) {
    const trainer = await this.prisma.trainer.findUnique({
      where: { id },
      select: { studioId: true },
    });
    return trainer?.studioId ?? null;
  }

  private trainerListSelect = {
    id: true,
    name: true,
    email: true,
    phone: true,
    accessLevel: true,
    studioId: true,
    userId: true,
    TrainerInvite: {
      select: {
        status: true,
        expiresAt: true,
      },
    },
    Training: {
      select: {
        id: true,
        name: true,
        duration: true,
        price: true,
      },
    },
  } as const;

  private mapTrainerListRow(
    row: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      accessLevel: string;
      studioId: string;
      userId: string | null;
      TrainerInvite: { status: string; expiresAt: Date } | null;
      Training?: {
        id: string;
        name: string;
        duration: number;
        price: number;
      }[];
    },
    includePrivateFields: boolean,
  ) {
    const invite = row.TrainerInvite;
    return {
      id: row.id,
      name: row.name,
      email: includePrivateFields ? row.email : null,
      phone: includePrivateFields ? row.phone : null,
      accessLevel: row.accessLevel,
      studioId: row.studioId,
      userId: includePrivateFields ? row.userId : null,
      invite: invite
        ? {
            status: invite.status,
            expiresAt: invite.expiresAt.toISOString(),
          }
        : null,
      Training: row.Training,
    };
  }

  async findByStudioId(studioId: string, includePrivateFields = false) {
    const rows = await this.prisma.trainer.findMany({
      where: { studioId },
      select: this.trainerListSelect,
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => this.mapTrainerListRow(row, includePrivateFields));
  }

  async findTrainerById(id: string, includePrivateFields = false) {
    const row = await this.prisma.trainer.findUnique({
      where: { id },
      select: {
        ...this.trainerListSelect,
        Training: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            description: true,
          },
        },
        Studio: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
      },
    });
    if (!row) return null;
    const studio = includePrivateFields
      ? row.Studio
      : row.Studio
        ? {
            id: row.Studio.id,
            name: row.Studio.name,
            address: row.Studio.address,
            phone: null,
          }
        : null;
    return {
      ...this.mapTrainerListRow(row, includePrivateFields),
      Studio: studio,
    };
  }

  async createTrainer(data: {
    name: string;
    email?: string;
    phone?: string;
    accessLevel: 'ADMIN' | 'EMPLOYEE';
    studioId: string;
    trainingIds?: string[];
  }) {
    await this.planLimits.assertTrainerLimit(data.studioId);

    const studio = await this.prisma.studio.findUnique({
      where: { id: data.studioId },
      select: { status: true },
    });

    if (studio?.status === 'DRAFT') {
      await this.prisma.studio.update({
        where: { id: data.studioId },
        data: { status: 'READY' },
      });
    }

    const trainingIds = data.trainingIds;
    let trainingConnect: { connect: { id: string }[] } | undefined;
    if (trainingIds && trainingIds.length > 0) {
      trainingConnect = {
        connect: trainingIds.map((id) => ({ id })),
      };
    } else {
      const allTrainings = await this.prisma.training.findMany({
        where: { studioId: data.studioId },
        select: { id: true },
      });
      if (allTrainings.length > 0) {
        trainingConnect = {
          connect: allTrainings.map((t) => ({ id: t.id })),
        };
      }
    }

    const row = await this.prisma.trainer.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        accessLevel: data.accessLevel,
        studioId: data.studioId,
        ...(trainingConnect ? { Training: trainingConnect } : {}),
      },
      select: this.trainerListSelect,
    });
    return this.mapTrainerListRow(row, true);
  }

  async updateTrainer(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      accessLevel?: 'ADMIN' | 'EMPLOYEE';
      trainingIds?: string[];
    },
  ) {
    const trainingIds = data.trainingIds;
    let trainingUpdate: { set: { id: string }[] } | undefined;
    if (trainingIds !== undefined) {
      if (trainingIds.length === 0) {
        const trainer = await this.prisma.trainer.findUnique({
          where: { id },
          select: { studioId: true },
        });
        if (trainer) {
          const allTrainings = await this.prisma.training.findMany({
            where: { studioId: trainer.studioId },
            select: { id: true },
          });
          trainingUpdate = {
            set: allTrainings.map((t) => ({ id: t.id })),
          };
        }
      } else {
        trainingUpdate = {
          set: trainingIds.map((trainingId) => ({ id: trainingId })),
        };
      }
    }

    const row = await this.prisma.trainer.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.accessLevel !== undefined
          ? { accessLevel: data.accessLevel }
          : {}),
        ...(trainingUpdate ? { Training: trainingUpdate } : {}),
      },
      select: this.trainerListSelect,
    });
    return this.mapTrainerListRow(row, true);
  }

  async deleteTrainer(id: string) {
    return this.prisma.trainer.delete({
      where: { id },
    });
  }

  // ── Trainer Invite ────────────────────────────────────────────

  async generateInvite(
    trainerId: string,
    ownerId: string,
    sendToEmail?: string,
  ) {
    const trainer = await this.prisma.trainer.findFirst({
      where: { id: trainerId },
      select: {
        id: true,
        name: true,
        studioId: true,
        userId: true,
        Studio: { select: { ownerId: true, name: true } },
      },
    });
    if (!trainer || trainer.Studio?.ownerId !== ownerId) {
      throw new HttpException('Trainer not found', HttpStatus.NOT_FOUND);
    }
    if (trainer.userId) {
      throw new HttpException(
        'Trainer already has an account linked',
        HttpStatus.BAD_REQUEST,
      );
    }

    const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.trainerInvite.upsert({
      where: { trainerId },
      create: {
        token,
        studioId: trainer.studioId,
        trainerId,
        status: 'PENDING',
        expiresAt,
      },
      update: { token, status: 'PENDING', expiresAt },
    });

    const webUrl = process.env.FRONTEND_URL || 'https://henzo.app';
    const inviteUrl = `${webUrl}/trainer-invite/${token}`;

    if (sendToEmail) {
      const studioName = trainer.Studio?.name ?? 'Henzo';
      const loc = resolveClientEmailLocale();
      const L = TRAINER_INVITE_EMAIL_STRINGS[loc];
      await this.emailService.sendEmail({
        to: sendToEmail,
        subject: L.subject.replace('{studioName}', studioName),
        html: renderTrainerInviteHtml(inviteUrl, studioName, loc),
        fromName: 'Henzo',
      });
    }

    return {
      success: true,
      inviteUrl,
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async getInviteInfo(token: string) {
    const invite = await this.prisma.trainerInvite.findUnique({
      where: { token },
      select: {
        status: true,
        expiresAt: true,
        Trainer: { select: { name: true, email: true } },
        Studio: { select: { name: true, logoUrl: true } },
      },
    });
    if (!invite)
      throw new HttpException('Invite not found', HttpStatus.NOT_FOUND);
    if (invite.status === 'ACCEPTED') {
      throw new HttpException('Invite already accepted', HttpStatus.GONE);
    }
    if (invite.expiresAt < new Date()) {
      throw new HttpException('Invite expired', HttpStatus.GONE);
    }
    return {
      trainerName: invite.Trainer?.name,
      trainerEmail: invite.Trainer?.email,
      studioName: invite.Studio?.name,
      studioLogoUrl: invite.Studio?.logoUrl,
    };
  }

  async acceptInvite(token: string, userId: string, userEmail?: string | null) {
    const invite = await this.prisma.trainerInvite.findUnique({
      where: { token },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        trainerId: true,
        studioId: true,
        Trainer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            userId: true,
          },
        },
      },
    });
    if (!invite)
      throw new HttpException('Invite not found', HttpStatus.NOT_FOUND);
    if (invite.status === 'ACCEPTED') {
      throw new HttpException('Invite already accepted', HttpStatus.GONE);
    }
    if (invite.expiresAt < new Date()) {
      throw new HttpException('Invite expired', HttpStatus.GONE);
    }
    if (invite.Trainer?.userId && invite.Trainer.userId !== userId) {
      throw new HttpException(
        'Trainer already linked to another account',
        HttpStatus.CONFLICT,
      );
    }

    const inviteEmail = invite.Trainer?.email?.trim().toLowerCase();
    const acceptorEmail = userEmail?.trim().toLowerCase();
    if (inviteEmail && acceptorEmail && inviteEmail !== acceptorEmail) {
      throw new HttpException(
        'Invite email does not match your account',
        HttpStatus.FORBIDDEN,
      );
    }

    const trainer = invite.Trainer;

    // The name/phone the coach entered during registration lives on the User
    // record. The Trainer row was created with a placeholder (email prefix) at
    // invite time, so sync User -> Trainer here (not the other way around),
    // otherwise the studio owner keeps seeing the email prefix as the name.
    const acceptingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, phone: true },
    });
    const userName = acceptingUser?.name?.trim();
    const userPhone = acceptingUser?.phone?.trim();

    await this.prisma.$transaction([
      this.prisma.trainer.update({
        where: { id: invite.trainerId },
        data: {
          userId,
          ...(userName ? { name: userName } : {}),
          ...(userPhone ? { phone: userPhone } : {}),
        },
      }),
      this.prisma.trainerInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      }),
    ]);

    return {
      success: true,
      trainerId: invite.trainerId,
      studioId: invite.studioId,
    };
  }

  async getTrainerByUserId(userId: string) {
    const trainer = await this.prisma.trainer.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        accessLevel: true,
        studioId: true,
        Studio: { select: { id: true, name: true, logoUrl: true } },
        Training: {
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!trainer)
      throw new HttpException('Not a trainer', HttpStatus.NOT_FOUND);
    return {
      id: trainer.id,
      name: trainer.name,
      email: trainer.email,
      phone: trainer.phone,
      accessLevel: trainer.accessLevel,
      studioId: trainer.studioId,
      studioName: trainer.Studio?.name,
      studioLogoUrl: trainer.Studio?.logoUrl,
      trainings: trainer.Training.map((t) => ({
        id: t.id,
        name: t.name,
      })),
    };
  }
}
