import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Normalize Training payload for JSON (hide Prisma relation names where redundant). */
function mapTrainingResponse(t: any) {
  if (!t) return t;
  return {
    ...t,
    Staff: t.Staff ?? t.Trainer,
    Trainer: undefined,
  };
}

@Injectable()
export class TrainingsService {
  constructor(@Inject(PrismaService) private prisma: any) {}

  async isStudioOwnedByOwner(studioId: string, ownerId: string) {
    const studioRepo = this.prisma.studio ?? this.prisma.salon;
    if (!studioRepo) return false;
    const studio = await studioRepo.findUnique({
      where: { id: studioId },
      select: { ownerId: true },
    });
    return studio?.ownerId === ownerId;
  }

  async findTrainingStudioId(id: string) {
    const row = await this.training.findUnique({
      where: { id },
      select: { studioId: true },
    });
    return row?.studioId ?? null;
  }

  private get training() {
    return this.prisma.training ?? this.prisma.Training;
  }

  private get trainingCategory() {
    return this.prisma.trainingCategory ?? this.prisma.TrainingCategory;
  }

  async findByStudioId(studioId: string) {
    const items = await this.training.findMany({
      where: { studioId },
      select: {
        id: true,
        name: true,
        nameEn: true,
        nameVi: true,
        nameRu: true,
        description: true,
        descriptionEn: true,
        descriptionVi: true,
        descriptionRu: true,
        duration: true,
        price: true,
        studioId: true,
        trainingCategoryId: true,
        Trainer: {
          select: {
            id: true,
            name: true,
          },
        },
        trainingCategory: {
          select: {
            id: true,
            name_en: true,
            name_vn: true,
            name_ru: true,
            main_category_id: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return items.map((service: any) =>
      mapTrainingResponse({
        ...service,
        Staff: service.Trainer,
      }),
    );
  }

  async findTrainingById(id: string) {
    const service = await this.training.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        nameEn: true,
        nameVi: true,
        nameRu: true,
        description: true,
        descriptionEn: true,
        descriptionVi: true,
        descriptionRu: true,
        duration: true,
        price: true,
        studioId: true,
        trainingCategoryId: true,
        Trainer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
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
        trainingCategory: {
          select: {
            id: true,
            name_en: true,
            name_vn: true,
            name_ru: true,
          },
        },
      },
    });

    if (!service) return null;

    return mapTrainingResponse({
      ...service,
      Staff: service.Trainer,
    });
  }

  async findAllPublicTrainings() {
    const services = await this.training.findMany({
      include: {
        Studio: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
        trainingCategory: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return services.map((service: any) => mapTrainingResponse(service));
  }

  async createTraining(data: {
    name: string;
    description?: string;
    nameEn?: string;
    nameVi?: string;
    nameRu?: string;
    descriptionEn?: string;
    descriptionVi?: string;
    descriptionRu?: string;
    duration: number;
    price: number;
    studioId: string;
    trainingCategoryId?: number | null;
    /** @deprecated use trainingCategoryId */
    serviceCategoryId?: number | null;
    trainerIds?: string[];
    staffIds?: string[];
  }) {
    const studioRepo = this.prisma.studio ?? this.prisma.Studio;
    const trainerRepo = this.prisma.trainer ?? this.prisma.Trainer;
    if (!studioRepo || !this.training || !trainerRepo) {
      throw new Error('Training repositories are not available');
    }

    const staffIds = data.staffIds ?? data.trainerIds;
    const trainingCategoryId =
      data.trainingCategoryId ?? data.serviceCategoryId ?? null;

    const studio = await studioRepo.findUnique({
      where: { id: data.studioId },
      select: { status: true },
    });

    if (studio?.status === 'DRAFT') {
      await studioRepo.update({
        where: { id: data.studioId },
        data: { status: 'READY' },
      });
    }

    let trainerConnect: { connect: { id: string }[] } | undefined;
    if (staffIds && staffIds.length > 0) {
      trainerConnect = {
        connect: staffIds.map((id: string) => ({ id })),
      };
    } else {
      const allTrainers = await trainerRepo.findMany({
        where: { studioId: data.studioId },
        select: { id: true },
      });
      if (allTrainers.length > 0) {
        trainerConnect = {
          connect: allTrainers.map((tr: { id: string }) => ({ id: tr.id })),
        };
      }
    }

    const created = await this.training.create({
      data: {
        name: data.name,
        description: data.description,
        nameEn: data.nameEn,
        nameVi: data.nameVi,
        nameRu: data.nameRu,
        descriptionEn: data.descriptionEn,
        descriptionVi: data.descriptionVi,
        descriptionRu: data.descriptionRu,
        duration: data.duration,
        price: data.price,
        studioId: data.studioId,
        trainingCategoryId,
        ...(trainerConnect ? { Trainer: trainerConnect } : {}),
      },
      include: {
        Trainer: true,
        trainingCategory: true,
      },
    });

    return mapTrainingResponse({
      ...created,
      Staff: created.Trainer,
    });
  }

  async updateTraining(
    id: string,
    data: {
      name?: string;
      description?: string;
      nameEn?: string;
      nameVi?: string;
      nameRu?: string;
      descriptionEn?: string;
      descriptionVi?: string;
      descriptionRu?: string;
      duration?: number;
      price?: number;
      trainingCategoryId?: number | null;
      /** @deprecated */
      serviceCategoryId?: number | null;
      trainerIds?: string[];
      staffIds?: string[];
    },
  ) {
    const trainerRepo = this.prisma.trainer ?? this.prisma.Trainer;
    if (!this.training || !trainerRepo) {
      throw new Error('Training repositories are not available');
    }

    const staffIds = data.staffIds ?? data.trainerIds;
    const resolvedCategory =
      data.trainingCategoryId !== undefined ||
      data.serviceCategoryId !== undefined
        ? (data.trainingCategoryId ?? data.serviceCategoryId ?? null)
        : undefined;

    const updateData: Record<string, unknown> = {};
    const assign = <K extends keyof typeof data>(k: K) => {
      if (data[k] !== undefined) updateData[k as string] = data[k] as unknown;
    };
    assign('name');
    assign('description');
    assign('nameEn');
    assign('nameVi');
    assign('nameRu');
    assign('descriptionEn');
    assign('descriptionVi');
    assign('descriptionRu');
    assign('duration');
    assign('price');
    if (resolvedCategory !== undefined) {
      updateData.trainingCategoryId = resolvedCategory;
    }

    let trainerUpdate: { set: { id: string }[] } | undefined;
    if (staffIds !== undefined) {
      if (staffIds.length === 0) {
        const row = await this.training.findUnique({
          where: { id },
          select: { studioId: true },
        });
        if (row) {
          const allTrainers = await trainerRepo.findMany({
            where: { studioId: row.studioId },
            select: { id: true },
          });
          trainerUpdate = {
            set: allTrainers.map((tr: { id: string }) => ({ id: tr.id })),
          };
        }
      } else {
        trainerUpdate = {
          set: staffIds.map((staffId: string) => ({ id: staffId })),
        };
      }
    }

    const updated = await this.training.update({
      where: { id },
      data: {
        ...updateData,
        ...(trainerUpdate && { Trainer: trainerUpdate }),
      },
      include: {
        Trainer: true,
        trainingCategory: true,
      },
    });

    return mapTrainingResponse({
      ...updated,
      Staff: updated.Trainer,
    });
  }

  async deleteTraining(id: string) {
    return this.training.delete({
      where: { id },
    });
  }

  async searchServices(query: string) {
    if (!query || query.trim().length < 3) {
      return [];
    }

    const rows = await this.training.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            trainingCategory: {
              OR: [
                {
                  name_en: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  name_vn: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
                {
                  name_ru: {
                    contains: query,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          },
        ],
      },
      include: {
        trainingCategory: {
          select: {
            name_en: true,
            name_vn: true,
            name_ru: true,
          },
        },
        Studio: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      take: 10,
    });

    return rows.map((s: any) => mapTrainingResponse(s));
  }

  async findPopularServices(limit: number) {
    const rows = await this.training.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        duration: true,
        price: true,
        Studio: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        trainingCategory: {
          select: {
            name_en: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      take: limit,
    });
    return rows.map((s: any) => mapTrainingResponse(s));
  }

  async findTrendingServices(limit: number) {
    const rows = await this.training.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        duration: true,
        price: true,
        Studio: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        trainingCategory: {
          select: {
            name_en: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      take: limit,
    });
    return rows.map((s: any) => mapTrainingResponse(s));
  }

  async getTrainingCategories() {
    const repo = this.trainingCategory;
    if (!repo) {
      throw new Error('TrainingCategory model not available');
    }
    return repo.findMany({
      orderBy: { name_en: 'asc' },
    });
  }
}
