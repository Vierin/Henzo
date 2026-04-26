import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrainersService {
  constructor(private prisma: PrismaService) {}

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
}
