import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanLimitsService } from '../subscriptions/plan-limits.service';

@Injectable()
export class TrainersService {
  constructor(
    private prisma: PrismaService,
    private planLimits: PlanLimitsService,
  ) {}

  async isStudioOwnedByOwner(studioId: string, ownerId: string) {
    const salon = await this.prisma.studio.findUnique({
      where: { id: studioId },
      select: { ownerId: true },
    });
    return salon?.ownerId === ownerId;
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

  private mapTrainerListRow(row: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    accessLevel: string;
    studioId: string;
    userId: string | null;
    TrainerInvite: { status: string; expiresAt: Date } | null;
    Training?: { id: string; name: string; duration: number; price: number }[];
  }) {
    const invite = row.TrainerInvite;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      accessLevel: row.accessLevel,
      studioId: row.studioId,
      salonId: row.studioId,
      userId: row.userId,
      invite: invite
        ? {
            status: invite.status,
            expiresAt: invite.expiresAt.toISOString(),
          }
        : null,
      Training: row.Training,
    };
  }

  async findByStudioId(studioId: string) {
    const rows = await this.prisma.trainer.findMany({
      where: { studioId },
      select: this.trainerListSelect,
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => this.mapTrainerListRow(row));
  }

  async findTrainerById(id: string) {
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
    return { ...this.mapTrainerListRow(row), Studio: row.Studio };
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
    return this.mapTrainerListRow(row);
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
        const staff = await this.prisma.trainer.findUnique({
          where: { id },
          select: { studioId: true },
        });
        if (staff) {
          const allTrainings = await this.prisma.training.findMany({
            where: { studioId: staff.studioId },
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
    return this.mapTrainerListRow(row);
  }

  async deleteTrainer(id: string) {
    return this.prisma.trainer.delete({
      where: { id },
    });
  }

  // ── Trainer Invite ────────────────────────────────────────────

  /** Generate invite via Staff model ID (Flutter team management side). */
  async generateInviteFromStaff(staffId: string, ownerId: string) {
    const staff = await this.prisma.trainer.findFirst({
      where: { id: staffId },
      select: { id: true, name: true, email: true, studioId: true },
    });
    if (!staff)
      throw new HttpException('Staff not found', HttpStatus.NOT_FOUND);

    // Verify ownership
    const isOwner = await this.isStudioOwnedByOwner(staff.studioId, ownerId);
    if (!isOwner) throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    // Find or create matching Trainer record
    let trainer = staff.email
      ? await this.prisma.trainer.findFirst({
          where: {
            studioId: staff.studioId,
            email: { equals: staff.email, mode: 'insensitive' },
          },
          select: { id: true, userId: true },
        })
      : await this.prisma.trainer.findFirst({
          where: { studioId: staff.studioId, name: staff.name },
          select: { id: true, userId: true },
        });

    if (!trainer) {
      trainer = await this.prisma.trainer.create({
        data: {
          studioId: staff.studioId,
          name: staff.name,
          ...(staff.email ? { email: staff.email } : {}),
          accessLevel: 'EMPLOYEE',
        },
        select: { id: true, userId: true },
      });
    }

    return this.generateInvite(trainer.id, ownerId);
  }

  async generateInvite(trainerId: string, ownerId: string) {
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
    return {
      success: true,
      inviteUrl: `${webUrl}/trainer-invite/${token}`,
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

  async acceptInvite(token: string, userId: string) {
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

    const trainer = invite.Trainer;
    await this.prisma.$transaction([
      this.prisma.trainer.update({
        where: { id: invite.trainerId },
        data: { userId },
      }),
      this.prisma.trainerInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      }),
      ...(trainer?.name || trainer?.phone
        ? [
            this.prisma.user.update({
              where: { id: userId },
              data: {
                ...(trainer.name ? { name: trainer.name } : {}),
                ...(trainer.phone ? { phone: trainer.phone } : {}),
              },
            }),
          ]
        : []),
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
    };
  }
}
