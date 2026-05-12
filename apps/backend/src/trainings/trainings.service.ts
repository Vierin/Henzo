import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTrainingScheduleDto } from './dto/update-training-schedule.dto';
import { computeTrainingDisplayColor } from './training-color.util';
import { AnalyticsService } from '../analytics/analytics.service';

/** Normalize Training payload for JSON (hide Prisma relation names where redundant). */
function mapTrainingResponse(t: any) {
  if (!t) return t;
  const displayColor = computeTrainingDisplayColor({
    trainingId: t.id,
    trainingName: t.name,
    trainingCategoryId: t.trainingCategoryId,
    mainCategoryId: t.trainingCategory?.main_category_id,
    existingColor: t.displayColor,
  });
  return {
    ...t,
    displayColor,
    Staff: t.Staff ?? t.Trainer,
    Trainer: undefined,
  };
}

@Injectable()
export class TrainingsService {
  constructor(
    @Inject(PrismaService) private prisma: any,
    private readonly analytics: AnalyticsService,
  ) {}

  private parseHm(value: string): { hour: number; minute: number } {
    const [h, m] = value.split(':');
    return { hour: Number(h), minute: Number(m) };
  }

  private normalizeDateOnly(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private buildOccurrenceDates(
    startsFromDate: Date,
    daysOfWeek: number[],
    weeksCount: number,
  ): Date[] {
    const uniqueDays = Array.from(new Set(daysOfWeek)).sort((a, b) => a - b);
    const anchor = this.normalizeDateOnly(startsFromDate);
    const all: Date[] = [];
    for (let week = 0; week < weeksCount; week += 1) {
      for (const day of uniqueDays) {
        const mondayOffset = day - 1;
        const weekBase = new Date(anchor);
        weekBase.setDate(anchor.getDate() + week * 7);
        const weekDay = weekBase.getDay() === 0 ? 7 : weekBase.getDay();
        const delta = mondayOffset - (weekDay - 1);
        const candidate = new Date(weekBase);
        candidate.setDate(weekBase.getDate() + delta);
        if (candidate >= anchor) {
          all.push(candidate);
        }
      }
    }
    all.sort((a, b) => a.getTime() - b.getTime());
    return all;
  }

  private extractBookingPeriodDays(reminderSettings: unknown): number {
    const fallback = 14;
    if (!reminderSettings || typeof reminderSettings !== 'object')
      return fallback;
    const raw = (reminderSettings as Record<string, unknown>)[
      'bookingPeriodDays'
    ];
    let parsed: number | null = null;
    if (typeof raw === 'number') parsed = Math.floor(raw);
    if (typeof raw === 'string') parsed = Number.parseInt(raw, 10);
    if (!parsed || Number.isNaN(parsed)) return fallback;
    return Math.max(1, Math.min(60, parsed));
  }

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

  private async resolveMainCategoryId(
    trainingCategoryId: number | null | undefined,
  ): Promise<number | null> {
    if (trainingCategoryId == null) return null;
    const repo = this.trainingCategory;
    if (!repo) return null;
    const row = await repo.findUnique({
      where: { id: trainingCategoryId },
      select: { main_category_id: true },
    });
    const raw = row?.main_category_id;
    return typeof raw === 'number' ? raw : null;
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
        displayColor: true,
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
        displayColor: true,
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
            main_category_id: true,
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

    const mainCategoryId = await this.resolveMainCategoryId(trainingCategoryId);
    const displayColor = computeTrainingDisplayColor({
      trainingName: data.name,
      trainingCategoryId,
      mainCategoryId,
    });

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
        displayColor,
        ...(trainerConnect ? { Trainer: trainerConnect } : {}),
      },
      include: {
        Trainer: true,
        trainingCategory: true,
      },
    });

    this.analytics.track(null, 'class_created', {
      training_id: created.id,
      studio_id: data.studioId,
      training_category_id: trainingCategoryId,
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

    const existing = await this.training.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        trainingCategoryId: true,
        displayColor: true,
      },
    });
    if (!existing) {
      throw new Error('Training not found');
    }
    const nextName =
      typeof data.name === 'string' && data.name.trim().length > 0
        ? data.name
        : existing.name;
    const nextCategoryId =
      resolvedCategory !== undefined
        ? resolvedCategory
        : existing.trainingCategoryId;
    const nextMainCategoryId = await this.resolveMainCategoryId(nextCategoryId);
    const nextDisplayColor = computeTrainingDisplayColor({
      trainingId: existing.id,
      trainingName: nextName,
      trainingCategoryId: nextCategoryId,
      mainCategoryId: nextMainCategoryId,
      existingColor: existing.displayColor,
    });

    const updated = await this.training.update({
      where: { id },
      data: {
        ...updateData,
        displayColor: nextDisplayColor,
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

  async updateTrainingSchedule(id: string, dto: UpdateTrainingScheduleDto) {
    const training = await this.training.findUnique({
      where: { id },
      select: {
        id: true,
        studioId: true,
        duration: true,
        Studio: { select: { reminderSettings: true } },
      },
    });
    if (!training) {
      throw new Error('Training not found');
    }

    const slots = dto.slots ?? [];
    if (slots.length === 0) {
      throw new Error('At least one recurrence slot is required');
    }
    const invalidSlot = slots.find(
      (s) =>
        !Number.isInteger(s.day) ||
        s.day < 1 ||
        s.day > 7 ||
        !/^\d{2}:\d{2}$/.test(s.startTime),
    );
    if (invalidSlot) {
      throw new Error('Invalid slot value');
    }

    const effectiveFrom = dto.effectiveFrom
      ? new Date(dto.effectiveFrom)
      : new Date();
    if (Number.isNaN(effectiveFrom.getTime())) {
      throw new Error('Invalid effectiveFrom');
    }

    const bookingPeriodDays = this.extractBookingPeriodDays(
      training.Studio?.reminderSettings,
    );
    const rangeStart = this.normalizeDateOnly(effectiveFrom);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + bookingPeriodDays);

    const candidateDays = this.buildOccurrenceDates(
      rangeStart,
      slots.map((s) => s.day),
      Math.ceil(bookingPeriodDays / 7) + 2,
    ).filter((d) => d <= rangeEnd);

    const slotTimeByDay = new Map<number, string>();
    for (const slot of slots) {
      slotTimeByDay.set(slot.day, slot.startTime);
    }

    const desired = candidateDays
      .map((d) => {
        const weekday = d.getDay() === 0 ? 7 : d.getDay();
        const time = slotTimeByDay.get(weekday);
        if (!time) return null;
        const { hour, minute } = this.parseHm(time);
        const startsAt = new Date(d);
        startsAt.setHours(hour, minute, 0, 0);
        const endsAt = new Date(startsAt);
        endsAt.setMinutes(endsAt.getMinutes() + training.duration);
        return { startsAt, endsAt };
      })
      .filter((v): v is { startsAt: Date; endsAt: Date } => v !== null);

    const existing = await this.prisma.trainingSession.findMany({
      where: {
        trainingId: id,
        studioId: training.studioId,
        status: 'ACTIVE',
        startsAt: { gte: rangeStart, lte: rangeEnd },
      },
      select: {
        id: true,
        trainerId: true,
        capacity: true,
        startsAt: true,
        Enrollments: { select: { status: true } },
      },
      orderBy: { startsAt: 'asc' },
    });

    const mutable = existing.filter(
      (s: any) => !s.Enrollments?.some((e: any) => e.status === 'ACTIVE'),
    );
    const mutableIds = mutable.map((s: any) => s.id);
    const template = mutable[0] ?? existing[0] ?? null;

    const pairCount = Math.min(mutable.length, desired.length);
    let updatedCount = 0;
    let createdCount = 0;
    let skippedConflicts = 0;

    const usedStartsAt = new Set<number>();
    for (let i = 0; i < pairCount; i += 1) {
      const d = desired[i]!;
      usedStartsAt.add(d.startsAt.getTime());
      const row = mutable[i]!;
      const overlap = await this.prisma.trainingSession.findFirst({
        where: {
          studioId: training.studioId,
          id: { notIn: mutableIds },
          status: 'ACTIVE',
          startsAt: { lt: d.endsAt },
          endsAt: { gt: d.startsAt },
          ...(row.trainerId ? { trainerId: row.trainerId } : {}),
        },
        select: { id: true },
      });
      if (overlap) {
        skippedConflicts += 1;
        continue;
      }
      await this.prisma.trainingSession.update({
        where: { id: row.id },
        data: { startsAt: d.startsAt, endsAt: d.endsAt },
      });
      updatedCount += 1;
    }

    if (template) {
      for (let i = pairCount; i < desired.length; i += 1) {
        const d = desired[i]!;
        if (usedStartsAt.has(d.startsAt.getTime())) continue;
        const overlap = await this.prisma.trainingSession.findFirst({
          where: {
            studioId: training.studioId,
            id: { notIn: mutableIds },
            status: 'ACTIVE',
            startsAt: { lt: d.endsAt },
            endsAt: { gt: d.startsAt },
            ...(template.trainerId ? { trainerId: template.trainerId } : {}),
          },
          select: { id: true },
        });
        if (overlap) {
          skippedConflicts += 1;
          continue;
        }
        await this.prisma.trainingSession.create({
          data: {
            studioId: training.studioId,
            trainingId: id,
            trainerId: template.trainerId ?? null,
            startsAt: d.startsAt,
            endsAt: d.endsAt,
            capacity: template.capacity ?? 1,
            status: 'ACTIVE',
          },
        });
        createdCount += 1;
      }
    }

    const extraIds = mutable.slice(pairCount).map((s: any) => s.id);
    if (extraIds.length > 0) {
      await this.prisma.trainingSession.deleteMany({
        where: { id: { in: extraIds } },
      });
    }

    return {
      success: true,
      data: {
        bookingPeriodDays,
        effectiveFrom: rangeStart.toISOString(),
        desiredCount: desired.length,
        updatedCount,
        createdCount,
        removedCount: extraIds.length,
        skippedBookedCount: existing.length - mutable.length,
        skippedConflicts,
      },
    };
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
            main_category_id: true,
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
        displayColor: true,
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
            main_category_id: true,
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
        displayColor: true,
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
            main_category_id: true,
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
