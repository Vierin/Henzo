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
    const salon = await this.prisma.salon.findUnique({
      where: { id: studioId },
      select: { ownerId: true },
    });
    return salon?.ownerId === ownerId;
  }

  async findTrainerStudioId(id: string) {
    const trainer = await this.prisma.staff.findUnique({
      where: { id },
      select: { salonId: true },
    });
    return trainer?.salonId ?? null;
  }

  async findByStudioId(studioId: string) {
    const salonId = studioId;
    // Важно: Используем select вместо include для уменьшения payload
    return this.prisma.staff.findMany({
      where: { salonId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        accessLevel: true,
        salonId: true,
        Service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            // Убираем description - не нужен для списка
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findTrainerById(id: string) {
    // Важно: Используем select вместо include для уменьшения payload
    return this.prisma.staff.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        accessLevel: true,
        salonId: true,
        Service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            description: true,
            // Полные данные для деталей
          },
        },
        Salon: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            // Убираем другие поля - не нужны для деталей сотрудника
          },
        },
      },
    });
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

    const createData = {
      ...data,
      salonId: data.studioId,
      serviceIds: data.trainingIds,
    };
    // Update salon status to READY if it's DRAFT
    const salon = await this.prisma.salon.findUnique({
      where: { id: createData.salonId },
      select: { status: true },
    });

    if (salon?.status === 'DRAFT') {
      await this.prisma.salon.update({
        where: { id: createData.salonId },
        data: { status: 'READY' },
      });
    }

    // Extract serviceIds from data
    const { serviceIds, ...staffData } = createData;

    // If serviceIds is not provided or empty, connect to all services in the salon
    let serviceConnect: { connect: { id: string }[] } | undefined;
    if (serviceIds && serviceIds.length > 0) {
      serviceConnect = {
        connect: serviceIds.map((id) => ({ id })),
      };
    } else {
      // Get all services for the salon
      const allServices = await this.prisma.service.findMany({
        where: { salonId: createData.salonId },
        select: { id: true },
      });
      if (allServices.length > 0) {
        serviceConnect = {
          connect: allServices.map((service) => ({ id: service.id })),
        };
      }
    }

    // Важно: Используем select вместо include для уменьшения payload
    return this.prisma.staff.create({
      data: {
        ...staffData,
        Service: serviceConnect,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        accessLevel: true,
        salonId: true,
        Service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
          },
        },
      },
    });
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
    const updateData: {
      name?: string;
      email?: string;
      phone?: string;
      accessLevel?: 'ADMIN' | 'EMPLOYEE';
      serviceIds?: string[];
    } = {
      ...data,
      serviceIds: data.trainingIds,
    };
    // Extract serviceIds from data
    const { serviceIds, ...staffData } = updateData;

    // Prepare service connection if serviceIds is provided
    let serviceUpdate: { set: { id: string }[] } | undefined;
    if (serviceIds !== undefined) {
      if (serviceIds.length === 0) {
        // If empty array, connect to all services in the salon
        const staff = await this.prisma.staff.findUnique({
          where: { id },
          select: { salonId: true },
        });
        if (staff) {
          const allServices = await this.prisma.service.findMany({
            where: { salonId: staff.salonId },
            select: { id: true },
          });
          serviceUpdate = {
            set: allServices.map((service) => ({ id: service.id })),
          };
        }
      } else {
        serviceUpdate = {
          set: serviceIds.map((serviceId) => ({ id: serviceId })),
        };
      }
    }

    // Важно: Используем select вместо include для уменьшения payload
    return this.prisma.staff.update({
      where: { id },
      data: {
        ...staffData,
        ...(serviceUpdate && { Service: serviceUpdate }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        accessLevel: true,
        salonId: true,
        Service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
          },
        },
      },
    });
  }

  async deleteTrainer(id: string) {
    return this.prisma.staff.delete({
      where: { id },
    });
  }

  // ── Trainer Invite ────────────────────────────────────────────

  /** Generate invite via Staff model ID (Flutter team management side). */
  async generateInviteFromStaff(staffId: string, ownerId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId },
      select: { id: true, name: true, email: true, salonId: true },
    });
    if (!staff) throw new HttpException('Staff not found', HttpStatus.NOT_FOUND);

    // Verify ownership
    const isOwner = await this.isStudioOwnedByOwner(staff.salonId, ownerId);
    if (!isOwner) throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    // Find or create matching Trainer record
    let trainer = staff.email
      ? await this.prisma.trainer.findFirst({
          where: { studioId: staff.salonId, email: { equals: staff.email, mode: 'insensitive' } },
          select: { id: true, userId: true },
        })
      : await this.prisma.trainer.findFirst({
          where: { studioId: staff.salonId, name: staff.name },
          select: { id: true, userId: true },
        });

    if (!trainer) {
      trainer = await this.prisma.trainer.create({
        data: {
          studioId: staff.salonId,
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
      create: { token, studioId: trainer.studioId, trainerId, status: 'PENDING', expiresAt },
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
        Trainer: { select: { name: true } },
        Studio: { select: { name: true, logoUrl: true } },
      },
    });
    if (!invite) throw new HttpException('Invite not found', HttpStatus.NOT_FOUND);
    if (invite.status === 'ACCEPTED') {
      throw new HttpException('Invite already accepted', HttpStatus.GONE);
    }
    if (invite.expiresAt < new Date()) {
      throw new HttpException('Invite expired', HttpStatus.GONE);
    }
    return {
      trainerName: invite.Trainer?.name,
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
        Trainer: { select: { id: true, name: true, userId: true } },
      },
    });
    if (!invite) throw new HttpException('Invite not found', HttpStatus.NOT_FOUND);
    if (invite.status === 'ACCEPTED') {
      throw new HttpException('Invite already accepted', HttpStatus.GONE);
    }
    if (invite.expiresAt < new Date()) {
      throw new HttpException('Invite expired', HttpStatus.GONE);
    }
    if (invite.Trainer?.userId && invite.Trainer.userId !== userId) {
      throw new HttpException('Trainer already linked to another account', HttpStatus.CONFLICT);
    }

    await this.prisma.$transaction([
      this.prisma.trainer.update({
        where: { id: invite.trainerId },
        data: { userId },
      }),
      this.prisma.trainerInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      }),
    ]);

    return { success: true, trainerId: invite.trainerId, studioId: invite.studioId };
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
    if (!trainer) throw new HttpException('Not a trainer', HttpStatus.NOT_FOUND);
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
