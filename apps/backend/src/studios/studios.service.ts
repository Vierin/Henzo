import { HttpException, HttpStatus, Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { CreateStudioDto } from './dto/create-studio.dto';
import { MapboxService } from '../mapbox/mapbox.service';
import { TranslationService } from '../trainings/translation.service';
import { computeTrainingDisplayColor } from '../trainings/training-color.util';
import { generateStudioSlug } from '../utils/slug';
import { nanoid } from 'nanoid';
import tzLookup from 'tz-lookup';
import { AnalyticsService } from '../analytics/analytics.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  countTrainingLocations,
  hasCompleteStudioDetails,
  resolveBrowseStudioLocationName,
  resolveStudioBrandNameForDiscovery,
  resolveSessionLocationDisplayName,
} from '../lib/training-locations';
import {
  buildPublicTrainerPayload,
  isUnclaimedStudio,
} from '../fitness/trainer-display.util';
import {
  assertValidClientReviewComment,
  assertValidReminderSettingsText,
  assertValidStudioDescription,
} from '../lib/text-content';

@Injectable()
export class StudiosService {
  private static readonly MAX_STUDIO_PHOTOS = 5;
  private static readonly DEFAULT_BOOKING_PERIOD_DAYS = 28;
  private static readonly MAX_BOOKING_PERIOD_DAYS = 60;

  constructor(
    @Inject(PrismaService) private prisma: any,
    private mapboxService: MapboxService,
    private translationService: TranslationService,
    private analytics: AnalyticsService,
    private notifications: NotificationsService,
  ) {}

  private normalizeReminderSettings(input: any): Record<string, unknown> {
    const base = input && typeof input === 'object' ? { ...input } : {};
    const raw = (base as Record<string, unknown>)['bookingPeriodDays'];
    let parsed = StudiosService.DEFAULT_BOOKING_PERIOD_DAYS;
    if (typeof raw === 'number') parsed = Math.floor(raw);
    if (typeof raw === 'string') {
      parsed =
        Number.parseInt(raw, 10) || StudiosService.DEFAULT_BOOKING_PERIOD_DAYS;
    }
    if (Number.isNaN(parsed)) {
      parsed = StudiosService.DEFAULT_BOOKING_PERIOD_DAYS;
    }
    (base as Record<string, unknown>)['bookingPeriodDays'] = Math.max(
      1,
      Math.min(60, parsed),
    );
    if (!Array.isArray((base as Record<string, unknown>)['intervals'])) {
      (base as Record<string, unknown>)['intervals'] = [24];
    }
    const clientReminders = (base as Record<string, unknown>)[
      'clientReminders'
    ];
    if (Array.isArray(clientReminders)) {
      (base as Record<string, unknown>)['clientReminders'] = clientReminders
        .slice(0, 2)
        .map((e) => this.normalizeClientReminderEntry(e))
        .filter((e): e is Record<string, unknown> => e !== null);
    }
    return base;
  }

  /** Validates one client-reminder rule (hoursBefore N | eveningBefore HH:MM). */
  private normalizeClientReminderEntry(
    entry: unknown,
  ): Record<string, unknown> | null {
    if (!entry || typeof entry !== 'object') return null;
    const e = entry as Record<string, unknown>;
    const enabled = e.enabled !== false;
    if (e.mode === 'eveningBefore') {
      const time =
        typeof e.time === 'string' && /^\d{1,2}:\d{2}$/.test(e.time)
          ? e.time
          : '20:00';
      return { mode: 'eveningBefore', time, enabled };
    }
    let hours = Number(e.hours);
    if (!Number.isFinite(hours)) hours = 24;
    hours = Math.max(1, Math.min(48, Math.floor(hours)));
    return { mode: 'hoursBefore', hours, enabled };
  }

  private assertStudioTextContent(input: {
    description?: string;
    reminderSettings?: unknown;
  }): void {
    if (input.description !== undefined) {
      assertValidStudioDescription(input.description);
    }
    if (input.reminderSettings !== undefined) {
      assertValidReminderSettingsText(input.reminderSettings);
    }
  }

  /** Public studio payloads: only social link extras (telegram, youtube, etc.). */
  private pickPublicReminderSettings(
    reminderSettings: unknown,
  ): { socialLinks: Array<{ platform: string; value: string }> } | undefined {
    if (!reminderSettings || typeof reminderSettings !== 'object') {
      return undefined;
    }
    const raw = reminderSettings as Record<string, unknown>;
    const socialLinks = raw.socialLinks;
    if (!Array.isArray(socialLinks) || socialLinks.length === 0) {
      return undefined;
    }
    const sanitized = socialLinks
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const entry = item as Record<string, unknown>;
        const platform =
          typeof entry.platform === 'string' ? entry.platform.trim() : '';
        const value = typeof entry.value === 'string' ? entry.value.trim() : '';
        if (!platform || !value) return null;
        return { platform, value };
      })
      .filter(
        (item): item is { platform: string; value: string } => item !== null,
      );
    if (sanitized.length === 0) return undefined;
    return { socialLinks: sanitized };
  }

  private isAllowedPhotoValue(photo: string): boolean {
    const trimmed = photo.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('data:image/')) return true;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return true;
    }
    try {
      const parsed = new URL(trimmed);
      return parsed.pathname.includes('/storage/v1/object/public/');
    } catch {
      return false;
    }
  }

  private normalizeStudioPhotos(input: unknown): string[] {
    if (!Array.isArray(input)) return [];
    const photos = input
      .filter((photo): photo is string => typeof photo === 'string')
      .map((photo) => photo.trim())
      .filter((photo) => photo.length > 0);
    if (photos.length > StudiosService.MAX_STUDIO_PHOTOS) {
      throw new Error(
        `Maximum ${StudiosService.MAX_STUDIO_PHOTOS} studio photos are allowed.`,
      );
    }
    const invalidPhoto = photos.find(
      (photo) => !this.isAllowedPhotoValue(photo),
    );
    if (invalidPhoto) {
      throw new Error('Invalid photo value. Use uploaded storage public URL.');
    }
    return photos;
  }

  private normalizePhotoCropRect(input: unknown): {
    x: number;
    y: number;
    w: number;
    h: number;
  } | null {
    if (!input || typeof input !== 'object') return null;
    const raw = input as Record<string, unknown>;
    const x = Number(raw.x);
    const y = Number(raw.y);
    const w = Number(raw.w);
    const h = Number(raw.h);
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(w) ||
      !Number.isFinite(h) ||
      w <= 0 ||
      h <= 0 ||
      x < 0 ||
      y < 0 ||
      x + w > 1.0001 ||
      y + h > 1.0001
    ) {
      return null;
    }
    return { x, y, w, h };
  }

  private normalizePhotoGallery(input: unknown): Array<{
    id: string;
    originalUrl: string;
    heroUrl: string;
    cardUrl: string;
    crops: {
      studioPage: { x: number; y: number; w: number; h: number };
      browseCard: { x: number; y: number; w: number; h: number };
    };
  }> {
    if (!Array.isArray(input)) return [];
    const gallery = input
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const raw = item as Record<string, unknown>;
        const id = typeof raw.id === 'string' ? raw.id.trim() : '';
        const originalUrl =
          typeof raw.originalUrl === 'string' ? raw.originalUrl.trim() : '';
        const heroUrl =
          typeof raw.heroUrl === 'string' ? raw.heroUrl.trim() : '';
        const cardUrl =
          typeof raw.cardUrl === 'string' ? raw.cardUrl.trim() : '';
        if (!id || !originalUrl || !heroUrl || !cardUrl) return null;
        if (
          !this.isAllowedPhotoValue(originalUrl) ||
          !this.isAllowedPhotoValue(heroUrl) ||
          !this.isAllowedPhotoValue(cardUrl)
        ) {
          return null;
        }
        const cropsRaw =
          raw.crops && typeof raw.crops === 'object'
            ? (raw.crops as Record<string, unknown>)
            : null;
        const studioPage = this.normalizePhotoCropRect(cropsRaw?.studioPage);
        const browseCard = this.normalizePhotoCropRect(cropsRaw?.browseCard);
        if (!studioPage || !browseCard) return null;
        return {
          id,
          originalUrl,
          heroUrl,
          cardUrl,
          crops: { studioPage, browseCard },
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);

    if (gallery.length > StudiosService.MAX_STUDIO_PHOTOS) {
      throw new Error(
        `Maximum ${StudiosService.MAX_STUDIO_PHOTOS} studio photos are allowed.`,
      );
    }
    return gallery;
  }

  private heroUrlsFromPhotoGallery(
    gallery: Array<{ heroUrl: string }>,
  ): string[] {
    return gallery
      .map((item) => item.heroUrl.trim())
      .filter((url) => url.length > 0);
  }

  private hasAtLeastOnePhoto(input: unknown): boolean {
    return (
      Array.isArray(input) &&
      input.some(
        (photo) => typeof photo === 'string' && photo.trim().length > 0,
      )
    );
  }

  private normalizeStudioLogoUrl(input: unknown): string | null {
    if (input == null) return null;
    if (typeof input !== 'string') {
      throw new Error('Invalid logo URL value.');
    }
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (!this.isAllowedPhotoValue(trimmed)) {
      throw new Error(
        'Invalid logo URL value. Use uploaded storage public URL.',
      );
    }
    return trimmed;
  }

  private hasLogoUrl(input: unknown): boolean {
    return typeof input === 'string' && input.trim().length > 0;
  }

  private hasContactInfo(studio: {
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    instagram?: string | null;
  }): boolean {
    return [studio.phone, studio.email, studio.website, studio.instagram].some(
      (value) => typeof value === 'string' && value.trim().length > 0,
    );
  }

  private shouldRetranslateStudioDescription(
    newDescription: string,
    existing: {
      description?: string | null;
      descriptionEn?: string | null;
      descriptionVi?: string | null;
      descriptionRu?: string | null;
    },
  ): boolean {
    const trimmed = newDescription.trim();
    if (!trimmed) return false;

    if (trimmed !== (existing.description ?? '').trim()) {
      return true;
    }

    return (
      !(existing.descriptionEn ?? '').trim() ||
      !(existing.descriptionVi ?? '').trim() ||
      !(existing.descriptionRu ?? '').trim()
    );
  }

  private scheduleStudioDescriptionTranslations(
    studioId: string,
    description: string,
  ): void {
    const trimmed = description.trim();
    if (!trimmed) return;

    void this.persistStudioDescriptionTranslations(studioId, trimmed).catch(
      (error) => {
        console.error(
          `⚠️ Background description translation failed for studio ${studioId}:`,
          error,
        );
      },
    );
  }

  private async persistStudioDescriptionTranslations(
    studioId: string,
    description: string,
  ): Promise<void> {
    console.log(`🌐 Background: translating studio ${studioId} description...`);
    const translations =
      await this.translationService.generateDescriptionTranslations(
        description,
      );

    const studioRepo = this.prisma.studio ?? this.prisma.Studio;
    if (!studioRepo) return;

    await studioRepo.update({
      where: { id: studioId },
      data: {
        descriptionEn: translations.descriptionEn || null,
        descriptionVi: translations.descriptionVi || null,
        descriptionRu: translations.descriptionRu || null,
      },
    });
    console.log(`✅ Background translations saved for studio ${studioId}`);
  }

  private getBookingPeriodDays(reminderSettings: unknown): number | null {
    if (!reminderSettings || typeof reminderSettings !== 'object') return null;
    const raw = (reminderSettings as Record<string, unknown>)[
      'bookingPeriodDays'
    ];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return Math.floor(raw);
    }
    if (typeof raw === 'string') {
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return null;
  }

  private getNormalizedBookingPeriodDays(reminderSettings: unknown): number {
    const raw = this.getBookingPeriodDays(reminderSettings);
    const parsed = raw ?? StudiosService.DEFAULT_BOOKING_PERIOD_DAYS;
    return Math.max(
      1,
      Math.min(StudiosService.MAX_BOOKING_PERIOD_DAYS, parsed),
    );
  }

  private getBookingCutoffDate(bookingPeriodDays: number): Date {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + bookingPeriodDays);
    cutoff.setHours(23, 59, 59, 999);
    return cutoff;
  }

  async getStudioOnboardingChecklist(studioId: string) {
    const studioRepo = this.prisma.studio ?? this.prisma.Studio;
    if (!studioRepo) {
      throw new Error('Studio repository is not available');
    }

    const studio = await studioRepo.findUnique({
      where: { id: studioId },
      select: {
        id: true,
        status: true,
        name: true,
        address: true,
        logoUrl: true,
        photos: true,
        photoGallery: true,
        description: true,
        phone: true,
        email: true,
        website: true,
        instagram: true,
        reminderSettings: true,
        _count: {
          select: {
            Training: true,
          },
        },
      },
    });

    if (!studio) {
      throw new Error('Studio not found');
    }

    const hasStudioDetails = hasCompleteStudioDetails(studio);
    const hasTraining = (studio._count?.Training ?? 0) > 0;
    const hasPhoto = this.hasAtLeastOnePhoto(studio.photos);

    const missingRequiredSteps: string[] = [];
    if (!hasStudioDetails) missingRequiredSteps.push('hasStudioDetails');
    if (!hasTraining) missingRequiredSteps.push('hasTraining');
    if (!hasPhoto) missingRequiredSteps.push('hasPhoto');

    const requiredCompleted = missingRequiredSteps.length === 0;

    return {
      studioId: studio.id,
      status: studio.status,
      requiredCompleted,
      canPublish: requiredCompleted,
      missingRequiredSteps,
      steps: {
        hasStudioDetails: {
          required: true,
          completed: hasStudioDetails,
        },
        hasTraining: {
          required: true,
          completed: hasTraining,
        },
        hasPhoto: {
          required: true,
          completed: hasPhoto,
        },
      },
    };
  }

  async getCurrentUserStudioOnboardingChecklist(userId: string) {
    const studioRepo = this.prisma.studio ?? this.prisma.Studio;
    if (!studioRepo) {
      throw new Error('Studio repository is not available');
    }
    const studio = await studioRepo.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!studio) {
      return null;
    }
    return this.getStudioOnboardingChecklist(studio.id);
  }

  async suggestStudios(params: { search: string; limit: number }) {
    const { search, limit } = params;
    if (!search || search.trim().length < 3) {
      return [];
    }
    const term = search.trim();
    return this.prisma.studio.findMany({
      where: {
        status: 'ACTIVE', // Only suggest active Studios
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { address: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        address: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  async findStudiosWithServices() {
    try {
      const studios = await this.prisma.studio.findMany({
        where: {
          status: 'ACTIVE', // Only show active Studios in public listings
        },
        select: {
          id: true,
          name: true,
          description: true,
          address: true,
          phone: true,
          email: true,
          website: true,
          instagram: true,
          logoUrl: true,
          photos: true,
          photoGallery: true,
          workingHours: true,
          reminderSettings: true,
          ownerId: true,
          createdAt: true,
          latitude: true,
          longitude: true,
          descriptionEn: true,
          descriptionVi: true,
          descriptionRu: true,
          slug: true,
          timezone: true,
          _count: {
            select: {
              Review: true,
              Training: true,
              Booking: true,
            },
          },
          Training: {
            take: 3, // Limit to 3 trainings per Studio for card display
            select: {
              id: true,
              name: true,
              description: true,
              duration: true,
              price: true,
              studioId: true,
              categoryId: true,
              trainingCategoryId: true,
              descriptionEn: true,
              descriptionVi: true,
              descriptionRu: true,
              trainingCategory: {
                select: {
                  id: true,
                  name_en: true,
                  name_vn: true,
                  name_ru: true,
                },
              },
            },
          },
          TrainingSession: {
            where: {
              status: 'ACTIVE',
              startsAt: {
                gte: new Date(),
              },
            },
            select: {
              id: true,
              startsAt: true,
              endsAt: true,
              capacity: true,
              bookedCount: true,
              Training: {
                select: {
                  id: true,
                  name: true,
                  duration: true,
                  price: true,
                  trainingCategoryId: true,
                  displayColor: true,
                  trainingCategory: {
                    select: {
                      chip_bg_hex: true,
                    },
                  },
                },
              },
              Trainer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              startsAt: 'asc',
            },
            take: 20,
          },
          Review: {
            take: 10, // Limit reviews to avoid huge payload
            select: {
              id: true,
              studioId: true,
              userId: true,
              bookingId: true,
              rating: true,
              comment: true,
              createdAt: true,
              User: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50, // P0: Максимальный лимит для предотвращения огромных payloads
      });

      // Transform to match expected format
      const transformedStudios = studios.map((studio: any) => ({
        ...studio,
        services: (studio.Training || []).map((service: any) => {
          const cat = service.trainingCategory;
          const transformedService: any = {
            ...service,
            trainingCategoryId: service.trainingCategoryId,
            trainingCategory: cat
              ? {
                  id: cat.id,
                  nameEn: cat.name_en,
                  nameVn: cat.name_vn,
                  nameRu: cat.name_ru,
                }
              : null,
          };

          return transformedService;
        }),
        Training: undefined, // Remove Prisma field
        reviews: studio.Review || [],
        Review: undefined, // Remove Prisma field
        owner: studio.User || null,
        User: undefined, // Remove Prisma field
        // Add derived categories from services
        categories: Array.from(
          new Set(
            (studio.Training || [])
              .map((s: any) => s.trainingCategoryId)
              .filter(Boolean),
          ),
        ),
      }));

      return transformedStudios;
    } catch (error) {
      console.error('❌ Error in findStudiosWithServices:', error);
      console.error('Error details:', {
        errorMessage: error.message,
        errorStack: error.stack,
      });
      throw new Error(
        `Failed to fetch Studios with services: ${error.message}`,
      );
    }
  }

  // New optimized search method with pagination and filters
  async searchStudios(params: {
    page?: number;
    limit?: number;
    search?: string;
    location?: string;
    category?: string;
    /** Comma-separated training category slugs (e.g. yoga,strength) */
    categories?: string;
    sortBy?: string;
    minRating?: number;
    isOpenNow?: boolean;
    date?: string;
    time?: string;
    north?: number;
    south?: number;
    east?: number;
    west?: number;
  }) {
    const {
      page = 1,
      limit: requestedLimit = 20,
      search = '',
      location = '',
      category = '',
      categories: categoriesCsv = '',
      sortBy = 'name',
      minRating = 0,
      isOpenNow = false,
      date,
      time,
      north: northIn,
      south: southIn,
      east: eastIn,
      west: westIn,
    } = params;

    const north =
      northIn !== undefined && !Number.isNaN(northIn) ? northIn : undefined;
    const south =
      southIn !== undefined && !Number.isNaN(southIn) ? southIn : undefined;
    const east =
      eastIn !== undefined && !Number.isNaN(eastIn) ? eastIn : undefined;
    const west =
      westIn !== undefined && !Number.isNaN(westIn) ? westIn : undefined;

    // P0: Максимальный лимит для предотвращения огромных payloads
    const limit = Math.min(requestedLimit, 50);

    const skip = (page - 1) * limit;

    const csvSlugs = categoriesCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    let studioCatsForFilter: { id: number; name: string; slug: string }[] = [];
    if (
      csvSlugs.length > 0 ||
      (category && category !== 'all' && Number.isNaN(parseInt(category, 10)))
    ) {
      studioCatsForFilter = await this.getStudioCategories();
    }

    // Build where clause
    const where: any = {
      status: 'ACTIVE', // Only show active Studios in public search
    };

    // Build category service filter first (needed for combining with search)
    let categoryServiceFilter: any = null;
    if (csvSlugs.length > 0) {
      const matched = studioCatsForFilter.filter((c) =>
        csvSlugs.includes(c.slug),
      );
      if (matched.length > 0) {
        categoryServiceFilter = {
          trainingCategoryId: { in: matched.map((c) => c.id) },
        };
      }
    } else if (category && category !== 'all') {
      const categoryId = parseInt(category, 10);

      if (!Number.isNaN(categoryId)) {
        // Numeric ID - treat as trainingCategoryId for backward compatibility
        categoryServiceFilter = { trainingCategoryId: categoryId };
      } else {
        const bySlug = studioCatsForFilter.find((cat) => cat.slug === category);
        if (bySlug) {
          categoryServiceFilter = { trainingCategoryId: bySlug.id };
        } else {
          // Fallback: filter by training category name
          categoryServiceFilter = {
            trainingCategory: {
              name_en: { equals: category, mode: 'insensitive' },
            },
          };
        }
      }
    }

    // Text search - combine with category filter if exists
    if (search.trim()) {
      const searchTerm = search.trim();
      const searchOR: any[] = [
        // Priority 2: Search by Studio name
        { name: { contains: searchTerm, mode: 'insensitive' } },
        // Priority 3: Search by Studio description and address
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { address: { contains: searchTerm, mode: 'insensitive' } },
      ];

      // Build service search conditions
      const serviceSearchConditions: any[] = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];

      // Combine service search with category filter if exists
      if (categoryServiceFilter) {
        // Search within specific category
        searchOR.unshift({
          Training: {
            some: {
              AND: [categoryServiceFilter, { OR: serviceSearchConditions }],
            },
          },
        });
      } else {
        // Search in all trainings
        searchOR.unshift({
          Training: {
            some: {
              OR: serviceSearchConditions,
            },
          },
        });
      }

      where.OR = searchOR;
    } else if (categoryServiceFilter) {
      // Only category filter, no search - apply directly
      where.Training = {
        some: categoryServiceFilter,
      };
    }

    // Location filter — match studio address (normalized + common city name variants)
    if (location.trim()) {
      const normalizedLocation = this.normalizeLocationForSearch(
        location.trim(),
      );

      const locationVariations = new Set<string>();
      locationVariations.add(normalizedLocation);
      locationVariations.add(location.trim());

      // Vietnamese-English name variations for major cities
      // Da Nang / Đà Nẵng
      if (/đà nẵng|da nang/i.test(normalizedLocation)) {
        locationVariations.add('Da Nang');
        locationVariations.add('Đà Nẵng');
        locationVariations.add('Da Nang, Vietnam');
        locationVariations.add('Đà Nẵng, Vietnam');
      }

      // Ho Chi Minh City / Hồ Chí Minh
      if (/hồ chí minh|ho chi minh/i.test(normalizedLocation)) {
        locationVariations.add('Ho Chi Minh City');
        locationVariations.add('Hồ Chí Minh');
        locationVariations.add('Ho Chi Minh City, Vietnam');
        locationVariations.add('Hồ Chí Minh, Vietnam');
        locationVariations.add('Ho Chi Minh');
      }

      // Create address conditions array
      const addressConditions = Array.from(locationVariations).map((loc) => ({
        address: { contains: loc, mode: 'insensitive' as const },
      }));

      // If we already have OR conditions (from search), wrap everything in AND
      if (where.OR) {
        const existingOR = where.OR;
        where.AND = [{ OR: existingOR }, { OR: addressConditions }];
        delete where.OR;
      } else {
        // If no OR conditions, use OR for address conditions directly
        where.OR = addressConditions;
      }
    }

    // Rating filter
    if (minRating > 0) {
      where.Review = {
        some: {
          rating: { gte: minRating },
        },
      };
    }

    const hasValidBbox =
      north !== undefined &&
      south !== undefined &&
      east !== undefined &&
      west !== undefined &&
      north >= south &&
      east >= west;

    const whereFinal = hasValidBbox
      ? {
          AND: [
            where,
            { latitude: { gte: south, lte: north } },
            { longitude: { gte: west, lte: east } },
          ],
        }
      : where;

    // Build orderBy clause
    let orderBy: any = { createdAt: 'desc' };
    switch (sortBy) {
      case 'name':
        orderBy = { name: 'asc' };
        break;
      case 'name-desc':
        orderBy = { name: 'desc' };
        break;
      case 'rating':
        // Cannot sort by _count directly, use createdAt as fallback
        // Rating sorting will be done in memory after fetching
        orderBy = { createdAt: 'desc' };
        break;
      case 'services':
        // Cannot sort by _count directly, use createdAt as fallback
        // Service count sorting will be done in memory after fetching
        orderBy = { createdAt: 'desc' };
        break;
      case 'created':
        orderBy = { createdAt: 'desc' };
        break;
    }

    // Get total count for pagination
    const total = await this.prisma.studio.count({ where: whereFinal });

    // Get paginated results with optimized select (only fields needed for cards)
    const studios = await this.prisma.studio.findMany({
      where: whereFinal,
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        phone: true,
        logoUrl: true,
        photos: true,
        photoGallery: true,
        workingHours: true,
        createdAt: true,
        latitude: true,
        longitude: true,
        slug: true,
        reminderSettings: true,
        _count: {
          select: {
            Review: true,
            Training: true,
          },
        },
        Training: {
          take: 3, // Only 3 trainings needed for card display
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
            trainingCategoryId: true,
          },
          orderBy: {
            id: 'asc', // Consistent ordering
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    });

    // Get Studio IDs for aggregate queries
    const studioIds = studios.map((s) => s.id);

    const { ratingMap, categoriesByStudio, categoryIdsByStudio } =
      await this.getStudioDiscoveryMeta(studioIds);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Mobile browse-card parity: locationName + training categories
    let transformedStudios = studios.map((studio: any) => {
      const ratingData = ratingMap.get(studio.id) || {
        avgRating: 0,
        reviewCount: 0,
      };
      const studioName = resolveStudioBrandNameForDiscovery({
        name: studio.name,
        slug: studio.slug,
        reminderSettings: studio.reminderSettings,
      });
      const avgRating = Math.round(ratingData.avgRating * 10) / 10;

      return {
        id: studio.id,
        name: studioName,
        studioName,
        description: studio.description,
        address: studio.address,
        locationName: resolveBrowseStudioLocationName(studio.reminderSettings),
        phone: studio.phone,
        logoUrl: studio.logoUrl,
        photos: studio.photos,
        photoGallery: studio.photoGallery,
        workingHours: studio.workingHours,
        createdAt: studio.createdAt,
        latitude: studio.latitude,
        longitude: studio.longitude,
        slug: studio.slug,
        _count: studio._count,
        services: (studio.Training || []).map((service: any) => ({
          id: service.id,
          name: service.name,
          duration: service.duration,
          price: service.price,
          trainingCategoryId: service.trainingCategoryId,
        })),
        reviews: [],
        avgRating,
        reviewCount: ratingData.reviewCount,
        rating: avgRating,
        categories: categoriesByStudio.get(studio.id) ?? [],
        trainingCategoryIds: categoryIdsByStudio.get(studio.id) ?? [],
      };
    });

    // Filter Studios by date and time if provided
    if (date) {
      const selectedDate = new Date(date);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const selectedDay = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
      );
      const isToday = today.getTime() === selectedDay.getTime();

      transformedStudios = transformedStudios.filter((Studio: any) => {
        const workingHours = Studio.workingHours;
        if (!workingHours || typeof workingHours !== 'object') {
          return true; // If no working hours, assume available
        }

        const dayOfWeek = selectedDate.getDay();
        const dayNames = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ];
        const dayName = dayNames[dayOfWeek];
        const dayHours = workingHours[dayName];

        if (!dayHours || dayHours.closed) {
          return false; // Studio is closed on this day
        }

        // If today, check if Studio is still open
        if (isToday) {
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          const currentTimeInMinutes = currentHour * 60 + currentMinute;

          const [closeHour, closeMinute] = (dayHours.close || '18:00')
            .split(':')
            .map(Number);
          const closeTimeInMinutes = closeHour * 60 + closeMinute;

          // Studio is closed if current time is past closing time (with 15 min buffer)
          if (currentTimeInMinutes >= closeTimeInMinutes - 15) {
            return false;
          }
        }

        // If time interval is specified, check if it overlaps with working hours
        if (time && time !== 'any') {
          const timeRanges: { [key: string]: { start: string; end: string } } =
            {
              morning: { start: '06:00', end: '12:00' },
              afternoon: { start: '12:00', end: '18:00' },
              evening: { start: '18:00', end: '22:00' },
            };

          const requestedRange = timeRanges[time.toLowerCase()];
          if (requestedRange) {
            const parseTime = (timeStr: string) => {
              const [hours, minutes] = timeStr.split(':').map(Number);
              return hours * 60 + minutes;
            };

            const openMinutes = parseTime(dayHours.open || '09:00');
            const closeMinutes = parseTime(dayHours.close || '18:00');
            const requestStartMinutes = parseTime(requestedRange.start);
            const requestEndMinutes = parseTime(requestedRange.end);

            // Check if time ranges overlap
            const overlaps =
              requestStartMinutes < closeMinutes &&
              requestEndMinutes > openMinutes;

            if (!overlaps) {
              return false;
            }

            // If today, also check if the requested time slot hasn't passed
            if (isToday) {
              const currentTimeInMinutes =
                now.getHours() * 60 + now.getMinutes();
              if (requestEndMinutes <= currentTimeInMinutes + 15) {
                return false; // Requested time slot has already passed
              }
            }
          }
        }

        return true;
      });
    }

    // Sort in memory if needed (for services count - rating already sorted via SQL if possible)
    if (sortBy === 'services') {
      transformedStudios.sort((a: any, b: any) => {
        const aCount = a._count?.Training || 0;
        const bCount = b._count?.Training || 0;
        return bCount - aCount; // Descending
      });
    } else if (sortBy === 'rating') {
      // Sort by avgRating (already calculated)
      transformedStudios.sort((a: any, b: any) => {
        return (b.avgRating || 0) - (a.avgRating || 0); // Descending
      });
    }

    // Recalculate total after filtering
    const filteredTotal = transformedStudios.length;
    const filteredTotalPages = Math.ceil(filteredTotal / limit);

    const result = {
      data: transformedStudios,
      pagination: {
        page,
        limit,
        total: date ? filteredTotal : total,
        totalPages: date ? filteredTotalPages : totalPages,
        hasNextPage: date ? page < filteredTotalPages : hasNextPage,
        hasPreviousPage,
      },
    };

    return result;
  }

  /**
   * Public filter chips: DB training categories with stable URL slugs
   * (`slugFromCategoryNameEn`).
   */
  async getStudioCategories(): Promise<
    { id: number; name: string; slug: string }[]
  > {
    const repo = this.prisma.trainingCategory ?? this.prisma.TrainingCategory;
    if (!repo) return [];
    const rows = await repo.findMany({
      orderBy: { name_en: 'asc' },
      select: { id: true, name_en: true },
    });
    return rows.map((r: { id: number; name_en: string }) => ({
      id: r.id,
      name: r.name_en,
      slug: StudiosService.slugFromCategoryNameEn(r.name_en),
    }));
  }

  private static slugFromCategoryNameEn(nameEn: string): string {
    return nameEn
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async getCurrentUserStudio(userId: string) {
    console.log('🔍 Looking for studio for user:', userId);
    const studioRepo = this.prisma.studio;
    const studio = studioRepo
      ? await studioRepo.findFirst({
          where: { ownerId: userId },
          select: {
            id: true,
            name: true,
            description: true,
            address: true,
            phone: true,
            email: true,
            website: true,
            instagram: true,
            logoUrl: true,
            photos: true,
            photoGallery: true,
            workingHours: true,
            reminderSettings: true,
            ownerId: true,
            createdAt: true,
            latitude: true,
            longitude: true,
            descriptionEn: true,
            descriptionVi: true,
            descriptionRu: true,
            slug: true,
            timezone: true,
            status: true,
            autoConfirmBookings: true,
            Training: {
              select: {
                id: true,
                trainingCategoryId: true,
              },
            },
            Trainer: {
              select: {
                id: true,
                name: true,
              },
            },
            User: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          } as any,
        })
      : null;

    console.log('🔍 Studio found:', studio ? `ID: ${studio.id}` : 'None');
    if (studio) {
      (studio as any).Service = (studio as any).Training || [];
      (studio as any).Staff = (studio as any).Trainer || [];
      // Derive categories from services instead of Studio.categoryIds
      const services =
        (studio as { Training?: { trainingCategoryId: number | null }[] })
          .Training ?? [];
      const serviceCategoryIds = Array.from(
        new Set(services.map((s) => s.trainingCategoryId).filter(Boolean)),
      );
      (studio as any).categories = serviceCategoryIds;
      // Average rating from reviews (как в веб — 5.0)
      const studioId = (studio as unknown as { id: string }).id;
      const ratingWhere = this.prisma.studio
        ? { studioId: studioId }
        : { studioId: studioId };
      const ratingAgg = await this.prisma.review.aggregate({
        where: ratingWhere,
        _avg: { rating: true },
        _count: { rating: true },
      });
      const countRating =
        (ratingAgg._count as { rating?: number })?.rating ?? 0;
      const avgRating =
        (ratingAgg._avg as { rating?: number | null })?.rating ?? null;
      const avg = countRating > 0 && avgRating != null ? avgRating : null;
      (studio as any).rating =
        avg != null ? Math.round(avg * 10) / 10 : undefined;
    }
    return studio;
  }

  async createCurrentUserStudio(
    createStudioDto: CreateStudioDto,
    userId: string,
  ) {
    try {
      const studioRepo = this.prisma.studio;
      const existingStudio = await studioRepo.findFirst({
        where: { ownerId: userId },
        select: {
          id: true,
          ownerId: true,
        },
      });

      if (existingStudio) {
        return this.getCurrentUserStudio(userId);
      }

      return this.createStudioForOwner(createStudioDto, userId);
    } catch (error) {
      console.error('❌ Error creating Studio:', error);
      throw error;
    }
  }

  /**
   * Create a studio for a specific owner. Used by owner self-serve and admin
   * unclaimed-studio creation (tech owner + intendedOwnerEmail).
   */
  async createStudioForOwner(
    createStudioDto: CreateStudioDto,
    ownerId: string,
    options?: { intendedOwnerEmail?: string | null },
  ) {
    try {
      this.assertStudioTextContent({
        description: createStudioDto.description,
        reminderSettings: createStudioDto.reminderSettings,
      });

      const normalizedPhotoGallery =
        createStudioDto.photoGallery !== undefined
          ? this.normalizePhotoGallery(createStudioDto.photoGallery)
          : [];
      const normalizedPhotos =
        normalizedPhotoGallery.length > 0
          ? this.heroUrlsFromPhotoGallery(normalizedPhotoGallery)
          : this.normalizeStudioPhotos(createStudioDto.photos);
      const normalizedLogoUrl = this.normalizeStudioLogoUrl(
        createStudioDto.logoUrl,
      );

      let latitude = createStudioDto.latitude;
      let longitude = createStudioDto.longitude;
      let timezone = createStudioDto.timezone?.trim() || undefined;

      if (createStudioDto.address && !latitude && !longitude) {
        try {
          const geocodeResult = await this.mapboxService.geocodeAddress(
            createStudioDto.address,
            'VN',
          );
          if (geocodeResult) {
            latitude = geocodeResult.lat;
            longitude = geocodeResult.lon;
          }
        } catch (error) {
          console.error('⚠️ Failed to geocode address:', error);
        }
      }

      if (
        !timezone &&
        typeof latitude === 'number' &&
        typeof longitude === 'number'
      ) {
        try {
          timezone = tzLookup(latitude, longitude);
        } catch (error) {
          console.error(
            '⚠️ Failed to resolve timezone from coordinates:',
            error,
          );
        }
      }

      const intendedOwnerEmail = options?.intendedOwnerEmail
        ? options.intendedOwnerEmail.trim().toLowerCase()
        : null;

      const result = await this.prisma.$transaction(async (tx) => {
        const studioRepo = (tx as any).studio ?? (tx as any).Studio;
        if (!studioRepo) {
          throw new Error('Studio repository is not available in transaction');
        }
        const usesStudioModel = Boolean((tx as any).studio);
        const reminderSettings = this.normalizeReminderSettings(
          createStudioDto.reminderSettings,
        );

        const studio = await studioRepo.create({
          data: {
            ...createStudioDto,
            logoUrl: normalizedLogoUrl,
            photos: normalizedPhotos,
            photoGallery:
              normalizedPhotoGallery.length > 0
                ? normalizedPhotoGallery
                : undefined,
            reminderSettings,
            latitude,
            longitude,
            timezone,
            ownerId,
            status: 'DRAFT',
            // Unclaimed (ops) studios require owner confirmation until settings change.
            autoConfirmBookings: !intendedOwnerEmail,
            intendedOwnerEmail: intendedOwnerEmail || undefined,
            claimedAt: null,
          } as any,
          select: {
            id: true,
            name: true,
            description: true,
            address: true,
            phone: true,
            email: true,
            website: true,
            instagram: true,
            logoUrl: true,
            photos: true,
            photoGallery: true,
            workingHours: true,
            reminderSettings: true,
            ownerId: true,
            intendedOwnerEmail: true,
            claimedAt: true,
            createdAt: true,
            latitude: true,
            longitude: true,
            descriptionEn: true,
            descriptionVi: true,
            descriptionRu: true,
            ...(usesStudioModel
              ? {
                  Training: true,
                  Trainer: true,
                }
              : {
                  Training: true,
                  Trainer: true,
                }),
            User: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        const now = new Date();

        const initialSubscriptionType = intendedOwnerEmail ? 'STUDIO' : 'SOLO';
        await tx.subscription.create({
          data: {
            studioId: studio.id,
            type: initialSubscriptionType,
            status: 'ACTIVE',
            startDate: now,
            updatedAt: now,
          },
        });

        const slug = generateStudioSlug(
          studio.name,
          studio.id,
          studio.address || undefined,
        );

        const studioWithSlug = await studioRepo.update({
          where: { id: studio.id },
          data: { slug },
          select: {
            id: true,
            name: true,
            description: true,
            address: true,
            phone: true,
            email: true,
            website: true,
            instagram: true,
            logoUrl: true,
            photos: true,
            photoGallery: true,
            workingHours: true,
            reminderSettings: true,
            ownerId: true,
            intendedOwnerEmail: true,
            claimedAt: true,
            createdAt: true,
            latitude: true,
            longitude: true,
            descriptionEn: true,
            descriptionVi: true,
            descriptionRu: true,
            slug: true,
            ...(usesStudioModel
              ? {
                  Training: true,
                  Trainer: true,
                }
              : {
                  Training: true,
                  Trainer: true,
                }),
            User: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        return studioWithSlug;
      });

      const services =
        (result as any).Service || (result as any).Training || [];
      const serviceCategoryIds = Array.from(
        new Set(
          services.map((s: any) => s?.trainingCategoryId).filter(Boolean),
        ),
      );
      (result as any).categories = serviceCategoryIds;
      (result as any).services = services;

      console.log(
        `✅ Created Studio "${result.name}" with default ${
          intendedOwnerEmail ? 'STUDIO' : 'SOLO'
        } subscription`,
      );
      const createdDescription = createStudioDto.description?.trim();
      if (createdDescription) {
        this.scheduleStudioDescriptionTranslations(
          (result as any).id,
          createdDescription,
        );
      }
      this.analytics.track(ownerId, 'studio_created', {
        studio_id: (result as any).id,
      });
      return result;
    } catch (error) {
      console.error('❌ Database error creating Studio:', error.message);
      throw error;
    }
  }

  async updateCurrentUserStudio(
    updateStudioDto: UpdateStudioDto,
    userId: string,
  ) {
    const studioRepo = this.prisma.studio ?? this.prisma.Studio;
    if (!studioRepo) {
      throw new Error('Studio repository is not available');
    }

    const existingStudio = await studioRepo.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!existingStudio) {
      throw new Error('Studio not found');
    }

    return this.updateStudioById(existingStudio.id, updateStudioDto);
  }

  /** Update a studio by id (admin / ops). Safe for multi-studio tech owners. */
  async updateStudioById(studioId: string, updateStudioDto: UpdateStudioDto) {
    const studioRepo = this.prisma.studio ?? this.prisma.Studio;
    if (!studioRepo) {
      throw new Error('Studio repository is not available');
    }

    const existingStudio = await studioRepo.findUnique({
      where: { id: studioId },
      select: {
        id: true,
        name: true,
        address: true,
        description: true,
        descriptionEn: true,
        descriptionVi: true,
        descriptionRu: true,
        reminderSettings: true,
        photos: true,
      },
    });

    if (!existingStudio) {
      throw new Error('Studio not found');
    }

    this.assertStudioTextContent({
      description: updateStudioDto.description,
      reminderSettings: updateStudioDto.reminderSettings,
    });

    const normalizedPhotoGallery =
      updateStudioDto.photoGallery !== undefined
        ? this.normalizePhotoGallery(updateStudioDto.photoGallery)
        : undefined;
    const normalizedPhotos =
      normalizedPhotoGallery !== undefined
        ? this.heroUrlsFromPhotoGallery(normalizedPhotoGallery)
        : updateStudioDto.photos !== undefined
          ? this.normalizeStudioPhotos(updateStudioDto.photos)
          : undefined;
    const normalizedLogoUrl =
      updateStudioDto.logoUrl !== undefined
        ? this.normalizeStudioLogoUrl(updateStudioDto.logoUrl)
        : undefined;

    let slug: string | undefined;
    if (
      (updateStudioDto.name && updateStudioDto.name !== existingStudio.name) ||
      (updateStudioDto.address &&
        updateStudioDto.address !== existingStudio.address)
    ) {
      slug = generateStudioSlug(
        updateStudioDto.name || existingStudio.name,
        existingStudio.id,
        updateStudioDto.address || existingStudio.address || undefined,
      );
    }

    const { ...StudioData } = {
      ...updateStudioDto,
      ...(normalizedLogoUrl !== undefined
        ? { logoUrl: normalizedLogoUrl }
        : {}),
      ...(normalizedPhotos !== undefined ? { photos: normalizedPhotos } : {}),
      ...(normalizedPhotoGallery !== undefined
        ? { photoGallery: normalizedPhotoGallery }
        : {}),
      ...(updateStudioDto.reminderSettings !== undefined
        ? {
            reminderSettings: this.normalizeReminderSettings(
              updateStudioDto.reminderSettings,
            ),
          }
        : {}),
    };

    let latitude = updateStudioDto.latitude;
    let longitude = updateStudioDto.longitude;

    if (updateStudioDto.address && !latitude && !longitude) {
      try {
        const geocodeResult = await this.mapboxService.geocodeAddress(
          updateStudioDto.address,
          'VN',
        );
        if (geocodeResult) {
          latitude = geocodeResult.lat;
          longitude = geocodeResult.lon;
        }
      } catch (error) {
        console.error('⚠️ Failed to geocode address:', error);
      }
    }

    let scheduleDescriptionTranslation = false;
    let descriptionForTranslation: string | undefined;
    let clearDescriptionTranslations = false;

    if (updateStudioDto.description !== undefined) {
      const trimmed = updateStudioDto.description.trim();
      if (!trimmed) {
        clearDescriptionTranslations = true;
      } else if (
        this.shouldRetranslateStudioDescription(trimmed, existingStudio)
      ) {
        scheduleDescriptionTranslation = true;
        descriptionForTranslation = trimmed;
      }
    }

    const updatedStudio = await studioRepo.update({
      where: { id: existingStudio.id },
      data: {
        ...StudioData,
        ...(clearDescriptionTranslations
          ? {
              descriptionEn: null,
              descriptionVi: null,
              descriptionRu: null,
            }
          : {}),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(slug && { slug }),
      } as any,
      include: {
        Training: true,
        Trainer: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const serviceCategoryIds = Array.from(
      new Set(
        (
          ((updatedStudio as any).Service ||
            (updatedStudio as any).Training ||
            []) as any[]
        )
          .map((s: any) => s.trainingCategoryId)
          .filter(Boolean),
      ),
    );
    (updatedStudio as any).categories = serviceCategoryIds;
    (updatedStudio as any).Service = (updatedStudio as any).Training || [];
    (updatedStudio as any).Staff = (updatedStudio as any).Trainer || [];

    if (scheduleDescriptionTranslation && descriptionForTranslation) {
      this.scheduleStudioDescriptionTranslations(
        existingStudio.id,
        descriptionForTranslation,
      );
    }

    // Re-apply reminder timing to already-enrolled clients when the config
    // changed (avoid needless work when other studio fields are saved).
    if (updateStudioDto.reminderSettings !== undefined) {
      const oldReminders = JSON.stringify(
        (existingStudio as { reminderSettings?: { clientReminders?: unknown } })
          .reminderSettings?.clientReminders ?? null,
      );
      const newReminders = JSON.stringify(
        (StudioData as { reminderSettings?: { clientReminders?: unknown } })
          .reminderSettings?.clientReminders ?? null,
      );
      if (oldReminders !== newReminders) {
        void this.notifications
          .rescheduleStudioClientReminders(existingStudio.id)
          .catch((err) =>
            console.error(
              '[Studios] Failed to reschedule client reminders:',
              err,
            ),
          );
      }
    }

    return updatedStudio; // Возвращаем салон напрямую
  }

  async findById(id: string) {
    try {
      console.log('StudiosService.findById called with id:', id);

      if (!id || id.trim() === '') {
        throw new Error('Studio ID is required');
      }

      // First, let's check if Studio exists at all
      const StudioExists = await this.prisma.Studio.findUnique({
        where: { id },
        select: { id: true, name: true },
      });
      console.log('Studio exists check:', StudioExists);

      if (!StudioExists) {
        console.log('❌ Studio not found with id:', id);
        return null;
      }

      // P1: Используем _count вместо загрузки всех reviews для проверки
      const reviewsCount = await this.prisma.review.count({
        where: { studioId: id },
      });
      console.log('Reviews count for Studio:', {
        studioId: id,
        reviewsCount,
      });

      const Studio = await this.prisma.Studio.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          address: true,
          phone: true,
          email: true,
          website: true,
          instagram: true,
          logoUrl: true,
          photos: true,
          photoGallery: true,
          workingHours: true,
          latitude: true,
          longitude: true,
          descriptionEn: true,
          descriptionVi: true,
          descriptionRu: true,
          slug: true,
          reminderSettings: true,
          claimedAt: true,
          intendedOwnerEmail: true,
          _count: {
            select: {
              Review: true,
              Training: true,
            },
          },
          Training: {
            // Remove limit - load all trainings for detail page
            select: {
              id: true,
              name: true,
              description: true,
              descriptionEn: true,
              descriptionVi: true,
              descriptionRu: true,
              duration: true,
              price: true,
              trainingCategoryId: true,
              trainingCategory: {
                select: {
                  id: true,
                  name_en: true,
                  name_vn: true,
                  name_ru: true,
                },
              },
            },
            orderBy: {
              id: 'asc', // Consistent ordering
            },
          },
          Review: {
            take: 50, // Increased from 20 to show more reviews, but still limited
            select: {
              id: true,
              rating: true,
              comment: true,
              createdAt: true,
              User: {
                select: {
                  id: true,
                  name: true,
                  // Removed email - not used on frontend
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      if (!Studio) {
        return null;
      }

      const publicReminderSettings = this.pickPublicReminderSettings(
        Studio.reminderSettings,
      );
      const hideTrainers = isUnclaimedStudio(Studio);
      const studioOwner = hideTrainers
        ? null
        : (Studio as any).User
          ? {
              id: (Studio as any).User.id,
              name: (Studio as any).User.name,
              email: (Studio as any).User.email,
            }
          : null;

      // Transform Prisma response to frontend format
      const transformedStudio = {
        id: Studio.id,
        name: Studio.name,
        description: Studio.description,
        address: Studio.address,
        locationName: resolveBrowseStudioLocationName(Studio.reminderSettings),
        phone: Studio.phone,
        email: Studio.email,
        website: Studio.website,
        instagram: Studio.instagram,
        ...(publicReminderSettings
          ? { reminderSettings: publicReminderSettings }
          : {}),
        logoUrl: Studio.logoUrl,
        photos: Studio.photos,
        workingHours: Studio.workingHours,
        latitude: Studio.latitude,
        longitude: Studio.longitude,
        descriptionEn: Studio.descriptionEn,
        descriptionVi: Studio.descriptionVi,
        descriptionRu: Studio.descriptionRu,
        slug: Studio.slug,
        _count: Studio._count,
        services: ((Studio as any).Training || []).map((service: any) => {
          const transformedService: any = {
            id: service.id,
            name: service.name,
            description: service.description,
            descriptionEn: service.descriptionEn,
            descriptionVi: service.descriptionVi,
            descriptionRu: service.descriptionRu,
            duration: service.duration,
            price: service.price,
            trainingCategoryId: service.trainingCategoryId,
          };

          if (service.trainingCategory) {
            transformedService.trainingCategory = {
              id: service.trainingCategory.id,
              nameEn: service.trainingCategory.name_en,
              nameVn: service.trainingCategory.name_vn,
              nameRu: service.trainingCategory.name_ru,
            };
          }

          return transformedService;
        }),
        reviews: ((Studio as any).Review || []).map((review: any) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt
            ? new Date(review.createdAt).toISOString()
            : new Date().toISOString(),
          user: review.User
            ? {
                id: review.User.id,
                name: review.User.name,
                // Removed email - not used on frontend
              }
            : undefined,
        })),
        owner: hideTrainers
          ? undefined
          : (Studio as any).User
            ? {
                id: (Studio as any).User.id,
                name: (Studio as any).User.name,
                avatarUrl: (Studio as any).User.avatarUrl ?? null,
              }
            : undefined,
        // Add derived categories from services
        categories: Array.from(
          new Set(
            ((Studio as any).Training || [])
              .map((s: any) => s.trainingCategoryId)
              .filter(Boolean),
          ),
        ),
        upcomingClasses: ((Studio as any).TrainingSession || []).map(
          (session: any) => ({
            id: session.id,
            startsAt: session.startsAt
              ? new Date(session.startsAt).toISOString()
              : null,
            endsAt: session.endsAt
              ? new Date(session.endsAt).toISOString()
              : null,
            capacity: session.capacity,
            bookedCount: session.bookedCount,
            training: session.Training
              ? {
                  id: session.Training.id,
                  name: session.Training.name,
                  duration: session.Training.duration,
                  price: session.Training.price,
                  displayColor: computeTrainingDisplayColor({
                    trainingId: session.Training.id,
                    trainingName: session.Training.name,
                    trainingCategoryId: session.Training.trainingCategoryId,
                    categoryChipBgHex:
                      session.Training.trainingCategory?.chip_bg_hex,
                    existingColor: session.Training.displayColor,
                  }),
                }
              : null,
            trainer: hideTrainers
              ? null
              : buildPublicTrainerPayload(session.Trainer, studioOwner),
          }),
        ),
      };

      return transformedStudio as any;
    } catch (error) {
      console.error('❌ Error in findById:', error);
      console.error('Error details:', {
        id,
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack,
      });

      // Re-throw with more context
      const errorMessage = error.message || 'Unknown error';
      const enhancedError = new Error(
        `Failed to fetch Studio (${id}): ${errorMessage}`,
      );
      (enhancedError as any).originalError = error;
      throw enhancedError;
    }
  }

  /**
   * Find Studio by slug - optimized for fast lookups with indexed slug field
   * @param slug - Studio slug
   * @returns Studio data or null if not found
   */
  async findBySlug(slug: string) {
    try {
      if (!slug || slug.trim() === '') {
        return null;
      }

      // Fast lookup by slug using indexed field
      let Studio = await this.prisma.Studio.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          description: true,
          address: true,
          phone: true,
          email: true,
          website: true,
          instagram: true,
          logoUrl: true,
          photos: true,
          photoGallery: true,
          workingHours: true,
          reminderSettings: true,
          ownerId: true,
          createdAt: true,
          latitude: true,
          longitude: true,
          descriptionEn: true,
          descriptionVi: true,
          descriptionRu: true,
          slug: true,
          timezone: true,
          claimedAt: true,
          intendedOwnerEmail: true,
          _count: {
            select: {
              Review: true,
              Training: true,
              Booking: true,
              Trainer: true,
            },
          },
          Training: {
            take: 50,
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
              categoryId: true,
              trainingCategoryId: true,
              trainingCategory: {
                select: {
                  id: true,
                  name_en: true,
                  name_vn: true,
                  name_ru: true,
                },
              },
            },
          },
          Trainer: {
            select: {
              id: true,
              name: true,
              accessLevel: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      // Composite SEO slug `{name}-{cuid}` when DB slug is null / outdated
      if (!Studio) {
        const idMatch = slug.match(/-c[a-z0-9]{19,}$/i);
        const extractedId = idMatch
          ? idMatch[0].substring(1)
          : /^c[a-z0-9]{19,}$/i.test(slug)
            ? slug
            : null;
        if (extractedId) {
          Studio = await this.prisma.Studio.findUnique({
            where: { id: extractedId },
            select: {
              id: true,
              name: true,
              description: true,
              address: true,
              phone: true,
              email: true,
              website: true,
              instagram: true,
              logoUrl: true,
              photos: true,
              photoGallery: true,
              workingHours: true,
              reminderSettings: true,
              ownerId: true,
              createdAt: true,
              latitude: true,
              longitude: true,
              descriptionEn: true,
              descriptionVi: true,
              descriptionRu: true,
              slug: true,
              timezone: true,
              claimedAt: true,
              intendedOwnerEmail: true,
              _count: {
                select: {
                  Review: true,
                  Training: true,
                  Booking: true,
                  Trainer: true,
                },
              },
              Training: {
                take: 50,
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
                  categoryId: true,
                  trainingCategoryId: true,
                  trainingCategory: {
                    select: {
                      id: true,
                      name_en: true,
                      name_vn: true,
                      name_ru: true,
                    },
                  },
                },
              },
              Trainer: {
                select: {
                  id: true,
                  name: true,
                  accessLevel: true,
                  email: true,
                  phone: true,
                },
              },
            },
          });
        }
      }

      if (!Studio) {
        return null;
      }

      // Load reviews with user information
      const reviews = await this.prisma.review.findMany({
        where: { studioId: Studio.id },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const avgRating =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      // Transform to match expected format
      const transformedStudio = {
        ...Studio,
        trainers: (Studio as any).Trainer || [],
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: Studio._count.Review,
        reviews: reviews.map((review: any) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt
            ? new Date(review.createdAt).toISOString()
            : new Date().toISOString(),
          user: review.User
            ? {
                id: review.User.id,
                name: review.User.name,
                email: review.User.email,
              }
            : null,
        })),
        services: (Studio.Training || []).map((service: any) => {
          const transformedService: any = {
            id: service.id,
            name: service.name,
            description: service.description,
            descriptionEn: service.descriptionEn,
            descriptionVi: service.descriptionVi,
            descriptionRu: service.descriptionRu,
            duration: service.duration,
            price: service.price,
            studioId: service.studioId,
            categoryId: service.categoryId,
            trainingCategoryId: service.trainingCategoryId,
          };

          if (service.trainingCategory) {
            transformedService.trainingCategory = {
              id: service.trainingCategory.id,
              nameEn: service.trainingCategory.name_en,
              nameVn: service.trainingCategory.name_vn,
              nameRu: service.trainingCategory.name_ru,
            };
          }

          return transformedService;
        }),
        categories: Array.from(
          new Set(
            (Studio.Training || [])
              .map((s: any) => s.trainingCategoryId)
              .filter(Boolean),
          ),
        ),
      };

      // Remove Prisma-specific fields
      delete (transformedStudio as any).Training;
      delete (transformedStudio as any).Trainer;
      delete (transformedStudio as any).Review;
      delete (transformedStudio as any).User;

      return transformedStudio as any;
    } catch (error) {
      console.error('❌ Error in findBySlug:', error);
      return null;
    }
  }

  /** Active studios with slugs for sitemap generation. */
  async findPublicSlugsForSitemap(): Promise<
    Array<{ slug: string; updatedAt: string }>
  > {
    const studios = await this.prisma.studio.findMany({
      where: {
        status: 'ACTIVE',
        slug: { not: null },
      },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    });

    return studios
      .filter((s): s is { slug: string; updatedAt: Date } => Boolean(s.slug))
      .map((s) => ({
        slug: s.slug,
        updatedAt: s.updatedAt.toISOString(),
      }));
  }

  /** Same payload shape as findBySlug but without owner linkage, trainer/reviewer PII, or private reminder settings. */
  async findPublicBySlug(slug: string) {
    const full = await this.findBySlug(slug);
    if (!full) return null;
    const studio = full as Record<string, unknown>;
    delete studio.ownerId;
    const publicReminderSettings = this.pickPublicReminderSettings(
      studio.reminderSettings,
    );
    if (publicReminderSettings) {
      studio.reminderSettings = publicReminderSettings;
    } else {
      delete studio.reminderSettings;
    }
    const hideTrainers = isUnclaimedStudio({
      claimedAt: studio.claimedAt as Date | string | null | undefined,
      intendedOwnerEmail: studio.intendedOwnerEmail as
        | string
        | null
        | undefined,
    });
    // Don't leak claim ops fields / tech-owner team on public pages.
    delete studio.claimedAt;
    delete studio.intendedOwnerEmail;
    if (hideTrainers) {
      studio.trainers = [];
    } else {
      const trainers = studio.trainers as
        | Array<Record<string, unknown>>
        | undefined;
      if (Array.isArray(trainers)) {
        studio.trainers = trainers.map((t) => ({
          id: t.id,
          name: t.name,
          accessLevel: t.accessLevel,
        }));
      }
    }
    const reviews = studio.reviews as Array<{
      user?: { id?: unknown; name?: unknown; email?: unknown };
      [k: string]: unknown;
    }> | null;
    if (Array.isArray(reviews)) {
      studio.reviews = reviews.map((r) => ({
        ...r,
        user: r.user ? { id: r.user.id, name: r.user.name } : null,
      }));
    }
    return studio as any;
  }

  async findPublicScheduleById(
    id: string,
    params?: { fromIso?: string; toIso?: string; limit?: number },
  ) {
    if (!id || id.trim().length === 0) {
      throw new Error('Studio ID is required');
    }

    const studio = await this.prisma.Studio.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        timezone: true,
        reminderSettings: true,
        claimedAt: true,
        intendedOwnerEmail: true,
        User: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    if (!studio || studio.status !== 'ACTIVE') {
      return [];
    }

    const hideTrainers = isUnclaimedStudio(studio);

    const studioOwner = studio.User
      ? {
          id: studio.User.id,
          name: studio.User.name,
          email: studio.User.email,
        }
      : null;

    const fromDate = params?.fromIso ? new Date(params.fromIso) : new Date();
    if (Number.isNaN(fromDate.getTime())) {
      throw new Error('Invalid from date');
    }
    const toDate = params?.toIso
      ? new Date(params.toIso)
      : new Date(fromDate.getTime() + 1000 * 60 * 60 * 24 * 60);
    if (Number.isNaN(toDate.getTime())) {
      throw new Error('Invalid to date');
    }
    const bookingPeriodDays = this.getNormalizedBookingPeriodDays(
      studio.reminderSettings,
    );
    const bookingCutoff = this.getBookingCutoffDate(bookingPeriodDays);
    const effectiveToDate = toDate < bookingCutoff ? toDate : bookingCutoff;
    if (effectiveToDate < fromDate) {
      return [];
    }
    const take = Math.min(Math.max(params?.limit ?? 300, 1), 500);

    const sessions = await this.prisma.trainingSession.findMany({
      where: {
        studioId: id,
        status: 'ACTIVE',
        startsAt: {
          gte: fromDate,
          lte: effectiveToDate,
        },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        capacity: true,
        bookedCount: true,
        locationId: true,
        Training: {
          select: {
            id: true,
            name: true,
            description: true,
            descriptionEn: true,
            descriptionVi: true,
            descriptionRu: true,
            duration: true,
            price: true,
            trainingCategoryId: true,
            language: true,
            displayColor: true,
            trainingCategory: {
              select: {
                chip_bg_hex: true,
                chip_fg_hex: true,
                name_en: true,
                name_vn: true,
                name_ru: true,
              },
            },
          },
        },
        Trainer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startsAt: 'asc' },
      take,
    });

    const studioName = studio.name?.trim() ?? 'Studio';
    const locationCount = countTrainingLocations(studio.reminderSettings);

    return sessions.map((s) => {
      const locationName = resolveSessionLocationDisplayName(
        studio.reminderSettings,
        s.locationId,
        studioName,
      );

      return {
        id: s.id,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        status: s.status,
        capacity: s.capacity,
        bookedCount: s.bookedCount,
        locationId: s.locationId ?? null,
        locationName,
        training: s.Training
          ? {
              id: s.Training.id,
              name: s.Training.name,
              description: s.Training.description,
              descriptionEn: s.Training.descriptionEn,
              descriptionVi: s.Training.descriptionVi,
              descriptionRu: s.Training.descriptionRu,
              duration: s.Training.duration,
              price: s.Training.price,
              trainingCategoryId: s.Training.trainingCategoryId,
              language: s.Training.language ?? 'en',
              displayColor: computeTrainingDisplayColor({
                trainingId: s.Training.id,
                trainingName: s.Training.name,
                trainingCategoryId: s.Training.trainingCategoryId,
                categoryChipBgHex: s.Training.trainingCategory?.chip_bg_hex,
                existingColor: s.Training.displayColor,
              }),
              trainingCategory: s.Training.trainingCategory
                ? {
                    chip_bg_hex: s.Training.trainingCategory.chip_bg_hex,
                    chip_fg_hex: s.Training.trainingCategory.chip_fg_hex,
                    name_en: s.Training.trainingCategory.name_en,
                    name_vn: s.Training.trainingCategory.name_vn,
                    name_ru: s.Training.trainingCategory.name_ru,
                  }
                : null,
            }
          : null,
        trainer: hideTrainers
          ? null
          : buildPublicTrainerPayload(s.Trainer, studioOwner),
        timezone: studio.timezone,
        studio: { locationCount },
      };
    });
  }

  // New optimized methods for better performance

  async findStudiosPreview(params: {
    limit: number;
    page: number;
    location?: string;
    featured?: boolean;
  }) {
    const { limit, page, location, featured } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (location) {
      where.address = { contains: location, mode: 'insensitive' };
    }

    if (featured) {
      // Featured Studios could be determined by rating, review count, etc.
      where.Review = {
        some: {
          rating: { gte: 4.0 },
        },
      };
    }

    // Add status filter for public listings
    const publicWhere = {
      ...where,
      status: 'ACTIVE',
    };

    const [Studios, total] = await Promise.all([
      this.prisma.Studio.findMany({
        where: publicWhere,
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          logoUrl: true,
          photos: true,
          photoGallery: true, // Get all photos, but we'll only use the first one
          _count: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.Studio.count({ where }),
    ]);

    return {
      data: Studios,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Ratings + distinct training categories per studio (indexed by studioId).
   * Used by featured and nearby list — two queries, not per-studio.
   */
  private async getStudioDiscoveryMeta(studioIds: string[]): Promise<{
    ratingMap: Map<string, { avgRating: number; reviewCount: number }>;
    categoriesByStudio: Map<string, string[]>;
    categoryIdsByStudio: Map<string, number[]>;
  }> {
    const empty = {
      ratingMap: new Map<string, { avgRating: number; reviewCount: number }>(),
      categoriesByStudio: new Map<string, string[]>(),
      categoryIdsByStudio: new Map<string, number[]>(),
    };
    if (studioIds.length === 0) return empty;

    const [ratingAggregates, categoryData] = await Promise.all([
      this.prisma.review.groupBy({
        by: ['studioId'],
        where: { studioId: { in: studioIds } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      this.prisma.training.findMany({
        where: {
          studioId: { in: studioIds },
          trainingCategoryId: { not: null },
        },
        select: {
          studioId: true,
          trainingCategoryId: true,
          trainingCategory: {
            select: {
              name_en: true,
              name_vn: true,
              name_ru: true,
            },
          },
        },
        distinct: ['studioId', 'trainingCategoryId'],
      }),
    ]);

    const ratingEntries: [
      string,
      { avgRating: number; reviewCount: number },
    ][] = ratingAggregates.map((agg) => [
      String(agg.studioId),
      {
        avgRating: Math.round((agg._avg.rating || 0) * 10) / 10,
        reviewCount: agg._count.rating,
      },
    ]);
    const ratingMap = new Map(ratingEntries);

    type Pair = { id: number; label: string };
    const pairMap = new Map<string, Pair[]>();
    for (const item of categoryData) {
      if (!item.trainingCategoryId || !item.trainingCategory) continue;
      const tc = item.trainingCategory;
      const label =
        tc.name_en?.trim() || tc.name_ru?.trim() || tc.name_vn?.trim() || '';
      if (!label) continue;
      const list = pairMap.get(item.studioId) ?? [];
      list.push({ id: item.trainingCategoryId, label });
      pairMap.set(item.studioId, list);
    }

    const categoriesByStudio = new Map<string, string[]>();
    const categoryIdsByStudio = new Map<string, number[]>();
    for (const [sid, pairs] of pairMap) {
      pairs.sort((a, b) => a.id - b.id);
      categoriesByStudio.set(
        sid,
        pairs.map((p) => p.label),
      );
      categoryIdsByStudio.set(
        sid,
        pairs.map((p) => p.id),
      );
    }

    return { ratingMap, categoriesByStudio, categoryIdsByStudio };
  }

  async findFeaturedStudios(limit: number) {
    // Get Studios with minimal data
    const Studios = await this.prisma.Studio.findMany({
      where: {
        status: 'ACTIVE', // Only show active Studios in featured listings
      },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        latitude: true,
        longitude: true,
        logoUrl: true,
        photos: true,
        photoGallery: true,
        reminderSettings: true,
        _count: {
          select: {
            Training: true,
            Review: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 2, // Get more to sort and filter, then take top N
    });

    if (Studios.length === 0) {
      return [];
    }

    // Get Studio IDs for aggregate queries
    const StudioIds = Studios.map((s) => s.id);

    const { ratingMap, categoriesByStudio, categoryIdsByStudio } =
      await this.getStudioDiscoveryMeta(StudioIds);

    // Enrich Studios with aggregated data
    const enriched = Studios.map((Studio) => {
      const ratingData = ratingMap.get(Studio.id) || {
        avgRating: 0,
        reviewCount: 0,
      };

      const categories = categoriesByStudio.get(Studio.id) ?? [];
      const trainingCategoryIds = categoryIdsByStudio.get(Studio.id) ?? [];
      const studioName = resolveStudioBrandNameForDiscovery({
        name: Studio.name,
        slug: Studio.slug,
        reminderSettings: Studio.reminderSettings,
      });

      return {
        id: Studio.id,
        name: studioName,
        studioName,
        address: Studio.address,
        locationName: resolveBrowseStudioLocationName(Studio.reminderSettings),
        latitude: Studio.latitude ?? undefined,
        longitude: Studio.longitude ?? undefined,
        photos: Studio.photos,
        photoGallery: Studio.photoGallery,
        slug: Studio.slug,
        avgRating: ratingData.avgRating,
        reviewCount: ratingData.reviewCount,
        categories,
        trainingCategoryIds,
        _count: {
          Training: Studio._count?.Training || 0,
          Review: ratingData.reviewCount,
          services: Studio._count?.Training || 0,
          reviews: ratingData.reviewCount,
        },
      };
    });

    // Sort by avgRating desc, then by reviews count desc
    enriched.sort((a, b) => {
      if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
      const br = (b._count?.Review || 0) - (a._count?.Review || 0);
      if (br !== 0) return br;
      return 0;
    });

    const result = enriched.slice(0, limit);

    return result;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /** Rough lat/lng bounding box for SQL pre-filter before Haversine. */
  private geoBoundingBox(lat: number, lng: number, radiusKm: number) {
    const latDelta = radiusKm / 111.32;
    const cosLat = Math.max(Math.cos(this.toRad(lat)), 0.01);
    const lngDelta = radiusKm / (111.32 * cosLat);
    return {
      south: lat - latDelta,
      north: lat + latDelta,
      west: lng - lngDelta,
      east: lng + lngDelta,
    };
  }

  async findNearbyStudios(params: {
    lat?: number;
    lng?: number;
    radius: number;
    limit: number;
    strict?: boolean;
  }) {
    return this.queryNearbyStudios(params, 'full');
  }

  async findNearbyStudiosForMap(params: {
    lat?: number;
    lng?: number;
    radius: number;
    limit: number;
    strict?: boolean;
  }) {
    return this.queryNearbyStudios(params, 'map');
  }

  private async queryNearbyStudios(
    params: {
      lat?: number;
      lng?: number;
      radius: number;
      limit: number;
      strict?: boolean;
    },
    mode: 'full' | 'map',
  ) {
    const { lat, lng, radius, limit, strict } = params;

    if (lat == null || lng == null) {
      return strict ? [] : this.findFeaturedStudios(limit);
    }

    const bbox = this.geoBoundingBox(lat, lng, radius);
    const select =
      mode === 'map'
        ? {
            id: true,
            name: true,
            slug: true,
            address: true,
            latitude: true,
            longitude: true,
            logoUrl: true,
            photos: true,
            reminderSettings: true,
          }
        : {
            id: true,
            name: true,
            slug: true,
            address: true,
            latitude: true,
            longitude: true,
            logoUrl: true,
            photos: true,
            photoGallery: true,
            reminderSettings: true,
            _count: {
              select: {
                Review: true,
                Booking: true,
              },
            },
          };

    const studios = await this.prisma.studio.findMany({
      where: {
        status: 'ACTIVE',
        latitude: { gte: bbox.south, lte: bbox.north },
        longitude: { gte: bbox.west, lte: bbox.east },
      },
      select,
    });

    const studiosWithDistance = studios
      .map((studio) => {
        if (studio.latitude == null || studio.longitude == null) return null;
        const distance = this.calculateDistance(
          lat,
          lng,
          studio.latitude,
          studio.longitude,
        );
        if (distance > radius) return null;
        return { ...studio, distance };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    if (studiosWithDistance.length === 0) {
      return strict ? [] : this.findFeaturedStudios(limit);
    }

    const nearbyIds = studiosWithDistance.map((s) => s.id);
    const { ratingMap, categoriesByStudio, categoryIdsByStudio } =
      await this.getStudioDiscoveryMeta(nearbyIds);

    return studiosWithDistance.map((s) => {
      const r = ratingMap.get(s.id) || { avgRating: 0, reviewCount: 0 };
      const studioName = resolveStudioBrandNameForDiscovery({
        name: s.name,
        slug: s.slug,
        reminderSettings: s.reminderSettings,
      });
      const locationName = resolveBrowseStudioLocationName(s.reminderSettings);
      const firstPhoto =
        Array.isArray(s.photos) && s.photos.length > 0
          ? s.photos[0]
          : undefined;

      if (mode === 'map') {
        return {
          id: s.id,
          name: studioName,
          address: s.address,
          locationName,
          lat: s.latitude ?? undefined,
          lng: s.longitude ?? undefined,
          logoUrl: s.logoUrl,
          photoUrl: firstPhoto,
          distance: s.distance,
          avgRating: r.avgRating,
          reviewCount: r.reviewCount,
          trainingCategoryIds: categoryIdsByStudio.get(s.id) ?? [],
          categories: categoriesByStudio.get(s.id) ?? [],
        };
      }

      return {
        id: s.id,
        name: studioName,
        studioName,
        address: s.address,
        locationName,
        latitude: s.latitude ?? undefined,
        longitude: s.longitude ?? undefined,
        photos: s.photos,
        photoGallery: s.photoGallery,
        logoUrl: s.logoUrl,
        slug: s.slug,
        distance: s.distance,
        avgRating: r.avgRating,
        reviewCount: r.reviewCount,
        categories: categoriesByStudio.get(s.id) ?? [],
        trainingCategoryIds: categoryIdsByStudio.get(s.id) ?? [],
        _count: s._count,
      };
    });
  }

  async getStudioStats(StudioId: string) {
    const [Studio, reviews, services] = await Promise.all([
      this.prisma.Studio.findUnique({
        where: { id: StudioId },
        select: { id: true, name: true },
      }),
      this.prisma.review.findMany({
        where: { studioId: StudioId },
        select: { rating: true },
      }),
      this.prisma.training.findMany({
        where: { studioId: StudioId },
        select: { id: true },
      }),
    ]);

    if (!Studio) {
      throw new Error('Studio not found');
    }

    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        : 0;

    return {
      StudioId: Studio.id,
      StudioName: Studio.name,
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      reviewCount: reviews.length,
      serviceCount: services.length,
    };
  }

  async getStudioAvailability(
    StudioId: string,
    date?: string,
    serviceId?: string,
  ) {
    const Studio = await this.prisma.Studio.findUnique({
      where: { id: StudioId },
      select: { workingHours: true },
    });

    if (!Studio) {
      throw new Error('Studio not found');
    }

    // For MVP, return basic availability
    // In production, you'd check actual bookings and staff schedules
    const workingHours = Studio.workingHours;

    return {
      StudioId,
      date: date || new Date().toISOString().split('T')[0],
      isOpen: true, // Simplified for MVP
      workingHours,
      availableSlots: [
        '09:00',
        '10:00',
        '11:00',
        '12:00',
        '13:00',
        '14:00',
        '15:00',
        '16:00',
        '17:00',
        '18:00',
      ],
      message: 'Basic availability - full implementation coming soon',
    };
  }

  /**
   * Normalize location name for search by removing administrative prefixes
   */
  private normalizeLocationForSearch(location: string): string {
    if (!location) return location;

    // Remove common Vietnamese administrative prefixes
    const prefixes = [
      /^Thành phố\s+/i, // City
      /^Tỉnh\s+/i, // Province
      /^Huyện\s+/i, // District
      /^Quận\s+/i, // Urban district
      /^Thị xã\s+/i, // Town
      /^Xã\s+/i, // Commune
      /^Phường\s+/i, // Ward
      /^Thị trấn\s+/i, // Township
    ];

    let cleaned = location.trim();
    for (const prefix of prefixes) {
      cleaned = cleaned.replace(prefix, '');
    }

    return cleaned.trim();
  }

  async createClientStudioReview(
    userId: string,
    studioId: string,
    data: {
      rating: number;
      comment?: string;
      enrollmentId?: string;
    },
  ): Promise<{ success: boolean; reviewId: string }> {
    const rating = Math.round(Number(data.rating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new HttpException(
        'Rating must be between 1 and 5',
        HttpStatus.BAD_REQUEST,
      );
    }

    const studio = await this.prisma.studio.findFirst({
      where: { id: studioId, status: 'ACTIVE' },
      select: { id: true, name: true },
    });
    if (!studio) {
      throw new HttpException('Studio not found', HttpStatus.NOT_FOUND);
    }

    if (data.enrollmentId) {
      const enrollment = await this.prisma.sessionEnrollment.findFirst({
        where: {
          id: data.enrollmentId,
          userId,
          status: { not: 'CANCELLED' },
          TrainingSession: { studioId },
        },
        select: {
          TrainingSession: { select: { endsAt: true } },
        },
      });
      if (!enrollment) {
        throw new HttpException('Booking not found', HttpStatus.NOT_FOUND);
      }
      if (enrollment.TrainingSession.endsAt > new Date()) {
        throw new HttpException(
          'You can review after the class ends',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const existing = await this.prisma.review.findFirst({
      where: { userId, studioId, bookingId: null },
      select: { id: true },
    });
    if (existing) {
      throw new HttpException(
        'You already left a review for this studio',
        HttpStatus.CONFLICT,
      );
    }

    const comment = data.comment?.trim();
    if (comment) {
      assertValidClientReviewComment(comment);
    }
    const [review, reviewer] = await Promise.all([
      this.prisma.review.create({
        data: {
          studioId,
          userId,
          rating,
          comment: comment && comment.length > 0 ? comment : null,
          bookingId: null,
        },
        select: { id: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      }),
    ]);

    // Notify studio owner — fire-and-forget
    const clientName =
      reviewer?.name?.trim() || reviewer?.email?.split('@')[0] || 'Client';
    void this.notifications.sendNewReviewNotification({
      studioId,
      studioName: studio.name || 'Studio',
      clientName,
      rating,
    });

    return { success: true, reviewId: review.id };
  }
}
