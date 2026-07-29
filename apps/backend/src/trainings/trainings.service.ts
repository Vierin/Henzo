import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTrainingScheduleDto } from './dto/update-training-schedule.dto';
import { computeTrainingDisplayColor } from './training-color.util';
import { AnalyticsService } from '../analytics/analytics.service';
import { PlanLimitsService } from '../subscriptions/plan-limits.service';

/** Normalize Training payload for JSON (hide Prisma relation names where redundant). */
function mapTrainingResponse(t: any) {
  if (!t) return t;
  const displayColor = computeTrainingDisplayColor({
    trainingId: t.id,
    trainingName: t.name,
    trainingCategoryId: t.trainingCategoryId,
    categoryChipBgHex: t.trainingCategory?.chip_bg_hex ?? null,
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
    private readonly planLimits: PlanLimitsService,
  ) {}

  private parseHm(value: string): { hour: number; minute: number } {
    const [h, m] = value.split(':');
    return { hour: Number(h), minute: Number(m) };
  }

  private normalizeDateOnly(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private sessionSlotKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
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
    const fallback = 30;
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
    const studioRepo = this.prisma.studio;
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
        description: true,
        descriptionEn: true,
        descriptionVi: true,
        descriptionRu: true,
        duration: true,
        price: true,
        studioId: true,
        trainingCategoryId: true,
        displayColor: true,
        language: true,
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
            chip_bg_hex: true,
            chip_fg_hex: true,
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
        description: true,
        descriptionEn: true,
        descriptionVi: true,
        descriptionRu: true,
        duration: true,
        price: true,
        studioId: true,
        trainingCategoryId: true,
        displayColor: true,
        language: true,
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
            chip_bg_hex: true,
            chip_fg_hex: true,
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
    language?: string;
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
  }) {
    const studioRepo = this.prisma.studio;
    const trainerRepo = this.prisma.trainer;
    if (!studioRepo || !this.training || !trainerRepo) {
      throw new Error('Training repositories are not available');
    }

    const trainerIds = data.trainerIds;
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
    if (Array.isArray(trainerIds)) {
      // Explicit list (may be empty) — admin optional trainer, etc.
      if (trainerIds.length > 0) {
        trainerConnect = {
          connect: trainerIds.map((id: string) => ({ id })),
        };
      }
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

    let categoryChipBgHex: string | null = null;
    if (trainingCategoryId != null) {
      const cat = await this.trainingCategory.findUnique({
        where: { id: trainingCategoryId },
        select: { chip_bg_hex: true },
      });
      categoryChipBgHex = cat?.chip_bg_hex ?? null;
    }
    const displayColor = computeTrainingDisplayColor({
      trainingName: data.name,
      trainingCategoryId,
      categoryChipBgHex,
    });

    const created = await this.training.create({
      data: {
        name: data.name,
        description: data.description,
        language: data.language,
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
      language?: string;
      descriptionEn?: string;
      descriptionVi?: string;
      descriptionRu?: string;
      duration?: number;
      price?: number;
      trainingCategoryId?: number | null;
      /** @deprecated */
      serviceCategoryId?: number | null;
      trainerIds?: string[];
    },
  ) {
    const trainerRepo = this.prisma.trainer;
    if (!this.training || !trainerRepo) {
      throw new Error('Training repositories are not available');
    }

    const trainerIds = data.trainerIds;
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
    assign('language');
    assign('descriptionEn');
    assign('descriptionVi');
    assign('descriptionRu');
    assign('duration');
    assign('price');
    if (resolvedCategory !== undefined) {
      updateData.trainingCategoryId = resolvedCategory;
    }

    let trainerUpdate: { set: { id: string }[] } | undefined;
    if (trainerIds !== undefined) {
      if (trainerIds.length === 0) {
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
          set: trainerIds.map((trainerId: string) => ({ id: trainerId })),
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
    let categoryChipBgHex: string | null = null;
    if (nextCategoryId != null) {
      const catRow = await this.trainingCategory.findUnique({
        where: { id: nextCategoryId },
        select: { chip_bg_hex: true },
      });
      categoryChipBgHex = catRow?.chip_bg_hex ?? null;
    }
    const categoryChanged =
      resolvedCategory !== undefined &&
      resolvedCategory !== existing.trainingCategoryId;
    const nextDisplayColor = computeTrainingDisplayColor({
      trainingId: existing.id,
      trainingName: nextName,
      trainingCategoryId: nextCategoryId,
      categoryChipBgHex,
      // Re-derive from the new category chip when category changes.
      existingColor: categoryChanged ? undefined : existing.displayColor,
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
    const nextCapacity =
      dto.capacity != null && dto.capacity > 0 ? dto.capacity : undefined;
    const nextLocationId =
      dto.locationId !== undefined ? dto.locationId?.trim() || null : undefined;
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
        locationId: true,
        startsAt: true,
        endsAt: true,
        Enrollments: { select: { status: true } },
      },
      orderBy: { startsAt: 'asc' },
    });

    const mutable = existing.filter(
      (s: any) => !s.Enrollments?.some((e: any) => e.status === 'ACTIVE'),
    );
    const mutableIds = mutable.map((s: any) => s.id);
    const template = mutable[0] ?? existing[0] ?? null;

    const desiredBySlot = new Map<string, { startsAt: Date; endsAt: Date }>();
    for (const d of desired) {
      desiredBySlot.set(this.sessionSlotKey(d.startsAt), d);
    }

    const mutableBySlot = new Map<string, (typeof mutable)[number]>();
    for (const row of mutable) {
      mutableBySlot.set(this.sessionSlotKey(row.startsAt), row);
    }

    let updatedCount = 0;
    let createdCount = 0;
    let skippedConflicts = 0;

    const toDelete = mutable
      .filter((row) => !desiredBySlot.has(this.sessionSlotKey(row.startsAt)))
      .map((row) => row.id);

    const rangeEndExclusive = new Date(rangeEnd);
    rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);

    const busySessions: Array<{
      id: string;
      trainerId: string | null;
      startsAt: Date;
      endsAt: Date;
    }> = await this.prisma.trainingSession.findMany({
      where: {
        studioId: training.studioId,
        status: 'ACTIVE',
        id: { notIn: mutableIds },
        startsAt: { lt: rangeEndExclusive },
        endsAt: { gt: rangeStart },
      },
      select: {
        id: true,
        trainerId: true,
        startsAt: true,
        endsAt: true,
      },
    });

    const hasOverlap = (
      startsAt: Date,
      endsAt: Date,
      trainerId: string | null,
    ): boolean =>
      busySessions.some(
        (s) =>
          startsAt < s.endsAt &&
          endsAt > s.startsAt &&
          (!trainerId || !s.trainerId || s.trainerId === trainerId),
      );

    const updateOps: Array<{
      where: { id: string };
      data: Record<string, unknown>;
    }> = [];
    const createRows: Array<Record<string, unknown>> = [];

    for (const [slotKey, d] of desiredBySlot) {
      const row = mutableBySlot.get(slotKey);
      if (row) {
        if (hasOverlap(d.startsAt, d.endsAt, row.trainerId)) {
          skippedConflicts += 1;
          continue;
        }
        const needsTime =
          row.startsAt.getTime() !== d.startsAt.getTime() ||
          row.endsAt.getTime() !== d.endsAt.getTime();
        const needsCapacity = nextCapacity != null;
        const needsLocation = nextLocationId !== undefined;
        if (!needsTime && !needsCapacity && !needsLocation) continue;

        const patch: Record<string, unknown> = {};
        if (needsTime) {
          patch.startsAt = d.startsAt;
          patch.endsAt = d.endsAt;
        }
        if (nextCapacity != null) patch.capacity = nextCapacity;
        if (nextLocationId !== undefined) {
          patch.locationId = nextLocationId;
        }
        updateOps.push({ where: { id: row.id }, data: patch });
        updatedCount += 1;
        continue;
      }

      if (!template) continue;

      if (hasOverlap(d.startsAt, d.endsAt, template.trainerId)) {
        skippedConflicts += 1;
        continue;
      }
      createRows.push({
        studioId: training.studioId,
        trainingId: id,
        trainerId: template.trainerId ?? null,
        locationId:
          nextLocationId !== undefined
            ? nextLocationId
            : (template.locationId ?? null),
        startsAt: d.startsAt,
        endsAt: d.endsAt,
        capacity: nextCapacity ?? template.capacity ?? 1,
        status: 'ACTIVE',
      });
      createdCount += 1;
    }

    if (createRows.length > 0) {
      await this.planLimits.assertCanCreateSessions(
        training.studioId,
        createRows.map((r) => r.startsAt as Date),
        {
          // Sessions being removed no longer count toward the month.
          excludeSessionIds: toDelete,
        },
      );
    }

    await this.prisma.$transaction(async (tx: any) => {
      for (const op of updateOps) {
        await tx.trainingSession.update(op);
      }
      if (createRows.length > 0) {
        await tx.trainingSession.createMany({ data: createRows });
      }
      if (toDelete.length > 0) {
        await tx.trainingSession.deleteMany({
          where: { id: { in: toDelete } },
        });
      }
    });

    return {
      success: true,
      data: {
        bookingPeriodDays,
        effectiveFrom: rangeStart.toISOString(),
        desiredCount: desired.length,
        updatedCount,
        createdCount,
        removedCount: toDelete.length,
        skippedBookedCount: existing.length - mutable.length,
        skippedConflicts,
      },
    };
  }

  async updateTrainingFutureSessionDefaults(
    id: string,
    data: { capacity?: number; locationId?: string },
  ) {
    const training = await this.training.findUnique({
      where: { id },
      select: { studioId: true },
    });
    if (!training) {
      throw new Error('Training not found');
    }
    const patch: Record<string, unknown> = {};
    if (data.capacity != null && data.capacity > 0) {
      patch.capacity = data.capacity;
    }
    if (data.locationId !== undefined) {
      patch.locationId = data.locationId?.trim() || null;
    }
    if (Object.keys(patch).length === 0) {
      return { success: true, updatedCount: 0 };
    }
    const rangeStart = this.normalizeDateOnly(new Date());
    const result = await this.prisma.trainingSession.updateMany({
      where: {
        trainingId: id,
        studioId: training.studioId,
        status: 'ACTIVE',
        startsAt: { gte: rangeStart },
      },
      data: patch,
    });
    return { success: true, updatedCount: result.count };
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
            chip_bg_hex: true,
            chip_fg_hex: true,
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
            chip_bg_hex: true,
            chip_fg_hex: true,
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
            chip_bg_hex: true,
            chip_fg_hex: true,
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
