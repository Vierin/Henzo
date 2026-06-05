import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanLimitsService } from '../subscriptions/plan-limits.service';
import { EmailService } from '../email/email.service';

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
    return this.mapTrainerListRow(row);
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
      await this.emailService.sendEmail({
        to: sendToEmail,
        subject: `You're invited to join ${studioName} on Henzo`,
        html: this._buildTrainerInviteHtml({ inviteUrl, studioName }),
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

  private _buildTrainerInviteHtml(params: {
    inviteUrl: string;
    studioName: string;
  }): string {
    const { inviteUrl, studioName } = params;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Trainer invitation</title>
</head>
<body style="margin:0;padding:0;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f2f2f2;">
    <tr><td style="padding:32px 16px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560"
             style="max-width:560px;width:100%;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#ff5b5b;padding:28px 32px;text-align:center;">
            <img src="https://henzo.app/logo.png" alt="Henzo" width="110"
                 style="display:block;margin:0 auto;max-width:110px;height:auto;"/>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 40px 32px;">
            <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#111111;line-height:1.3;">
              You've been invited to join ${studioName}
            </h1>
            <p style="margin:0 0 24px;font-size:15px;color:#555555;line-height:1.6;">
              You have been added as a trainer. Click the button below to create your account and get started.
            </p>
            <!-- Button -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:28px;">
              <tr><td style="text-align:center;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="background:#ff5b5b;border-radius:10px;text-align:center;">
                      <a href="${inviteUrl}"
                         style="display:inline-block;padding:14px 32px;color:#ffffff!important;text-decoration:none;font-size:16px;font-weight:700;border-radius:10px;background:#ff5b5b;white-space:nowrap;">
                        Accept invitation
                      </a>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <!-- Fallback URL -->
            <p style="margin:0 0 8px;font-size:13px;color:#888888;">If the button doesn't work, copy this link:</p>
            <p style="margin:0 0 24px;word-break:break-all;font-size:13px;color:#666666;background:#fafafa;padding:10px 14px;border-radius:8px;border:1px solid #eeeeee;">
              ${inviteUrl}
            </p>
            <!-- Divider -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:20px;">
              <tr><td style="border-top:1px solid #eeeeee;"></td></tr>
            </table>
            <p style="margin:0;font-size:13px;color:#aaaaaa;line-height:1.6;">
              This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eeeeee;">
            <p style="margin:0;font-size:13px;color:#bbbbbb;">
              &copy; ${new Date().getFullYear()} Henzo &nbsp;&middot;&nbsp;
              <a href="https://henzo.app" style="color:#ff5b5b;text-decoration:none;">henzo.app</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
