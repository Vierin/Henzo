import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { CreateStudioDto } from './dto/create-studio.dto';
import { MapboxService } from '../mapbox/mapbox.service';
import { TranslationService } from '../trainings/translation.service';
import { computeTrainingDisplayColor } from '../trainings/training-color.util';
import { generateStudioSlug } from '../utils/slug';
import { nanoid } from 'nanoid';
import { AnalyticsService } from '../analytics/analytics.service';
import {
  countTrainingLocations,
  resolveStudioBrandNameForDiscovery,
  resolveTrainingLocationName,
} from '../lib/training-locations';
import { buildPublicTrainerPayload } from '../fitness/trainer-display.util';

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
  ) {}

  private normalizeReminderSettings(input: any): Record<string, unknown> {
    const base = input && typeof input === 'object' ? { ...input } : {};
    const raw = (base as Record<string, unknown>)['bookingPeriodDays'];
    let parsed = StudiosService.DEFAULT_BOOKING_PERIOD_DAYS;
    if (typeof raw === 'number') parsed = Math.floor(raw);
    if (typeof raw === 'string') {
      parsed =
        Number.parseInt(raw, 10) ||
        StudiosService.DEFAULT_BOOKING_PERIOD_DAYS;
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
    return base;
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
        logoUrl: true,
        photos: true,
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

    const hasTraining = (studio._count?.Training ?? 0) > 0;
    const hasLogo = this.hasLogoUrl(studio.logoUrl);
    const hasPhoto = this.hasAtLeastOnePhoto(studio.photos);
    const bookingPeriodDays = this.getBookingPeriodDays(
      studio.reminderSettings,
    );
    const bookingWindowConfigured =
      bookingPeriodDays != null &&
      bookingPeriodDays !== StudiosService.DEFAULT_BOOKING_PERIOD_DAYS;
    const contactsConfigured = this.hasContactInfo(studio);

    const missingRequiredSteps: string[] = [];
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
        hasTraining: {
          required: true,
          completed: hasTraining,
        },
        hasPhoto: {
          required: true,
          completed: hasPhoto,
        },
        hasLogo: {
          required: false,
          completed: hasLogo,
        },
        bookingWindowConfigured: {
          required: false,
          completed: bookingWindowConfigured,
        },
        contactsConfigured: {
          required: false,
          completed: contactsConfigured,
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
      throw new Error('Studio not found');
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
              nameEn: true,
              nameVi: true,
              nameRu: true,
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
                  nameEn: true,
                  nameVi: true,
                  nameRu: true,
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
        { nameEn: { contains: searchTerm, mode: 'insensitive' } },
        { nameVi: { contains: searchTerm, mode: 'insensitive' } },
        { nameRu: { contains: searchTerm, mode: 'insensitive' } },
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
        workingHours: true,
        createdAt: true,
        latitude: true,
        longitude: true,
        slug: true,
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
            nameEn: true,
            nameVi: true,
            nameRu: true,
            duration: true,
            price: true,
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

    // Calculate average ratings for all Studios in one query (only if we have Studios)
    let ratingMap = new Map<
      string,
      { avgRating: number; reviewCount: number }
    >();
    if (studioIds.length > 0) {
      const ratingAggregates = await this.prisma.review.groupBy({
        by: ['studioId'],
        where: {
          studioId: { in: studioIds },
        },
        _avg: {
          rating: true,
        },
        _count: {
          rating: true,
        },
      });

      // Create a map for quick lookup
      ratingMap = new Map(
        ratingAggregates.map((agg) => [
          agg.studioId,
          {
            avgRating: agg._avg.rating || 0,
            reviewCount: agg._count.rating,
          },
        ]),
      );
    }

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Transform to match expected format (Service -> services) and add ratings
    let transformedStudios = studios.map((studio: any) => {
      const ratingData = ratingMap.get(studio.id) || {
        avgRating: 0,
        reviewCount: 0,
      };

      return {
        ...studio,
        services: (studio.Training || []).map((service: any) => ({
          id: service.id,
          name: service.name,
          nameEn: service.nameEn,
          nameVi: service.nameVi,
          nameRu: service.nameRu,
          duration: service.duration,
          price: service.price,
        })),
        Training: undefined, // Remove Prisma field
        reviews: [], // Empty array - not needed for cards, use avgRating instead
        avgRating: Math.round(ratingData.avgRating * 10) / 10, // Round to 1 decimal
        reviewCount: ratingData.reviewCount,
        rating: Math.round(ratingData.avgRating * 10) / 10, // Alias for compatibility
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
      const studioRepo = this.prisma.studio ?? this.prisma.salon;
      if (!studioRepo) {
        throw new Error('Studio repository is not available');
      }
      // Check if Studio already exists for this user
      const existingStudio = await studioRepo.findFirst({
        where: { ownerId: userId },
      });

      if (existingStudio) {
        // Idempotent behavior: return existing studio instead of throwing.
        // This prevents mobile setup flow from getting stuck in "Setup required".
        const currentStudio = await this.getCurrentUserStudio(userId);
        if (currentStudio) {
          return currentStudio;
        }
        return existingStudio;
      }

      const normalizedPhotos = this.normalizeStudioPhotos(
        createStudioDto.photos,
      );
      const normalizedLogoUrl = this.normalizeStudioLogoUrl(
        createStudioDto.logoUrl,
      );

      // Geocode address if provided and coordinates not provided
      let latitude = createStudioDto.latitude;
      let longitude = createStudioDto.longitude;

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
          // Continue without coordinates
        }
      }

      // Generate translations for description if provided
      let descriptionTranslations: {
        descriptionEn?: string;
        descriptionVi?: string;
        descriptionRu?: string;
      } = {};

      if (createStudioDto.description && createStudioDto.description.trim()) {
        try {
          console.log('🌐 Generating translations for Studio description...');
          const translations =
            await this.translationService.generateDescriptionTranslations(
              createStudioDto.description.trim(),
            );
          descriptionTranslations = {
            descriptionEn: translations.descriptionEn || undefined,
            descriptionVi: translations.descriptionVi || undefined,
            descriptionRu: translations.descriptionRu || undefined,
          };
          console.log('✅ Translations generated:', {
            en: descriptionTranslations.descriptionEn?.substring(0, 50),
            vi: descriptionTranslations.descriptionVi?.substring(0, 50),
            ru: descriptionTranslations.descriptionRu?.substring(0, 50),
          });
        } catch (error) {
          console.error(
            '⚠️ Failed to generate description translations:',
            error,
          );
          // Continue without translations, will use original description
        }
      }

      // Create Studio and subscription in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        const studioRepo = (tx as any).studio ?? (tx as any).Studio;
        if (!studioRepo) {
          throw new Error('Studio repository is not available in transaction');
        }
        const usesStudioModel = Boolean((tx as any).studio);
        // Set default reminder settings if not provided
        const reminderSettings = this.normalizeReminderSettings(
          createStudioDto.reminderSettings,
        );

        // Create the Studio first to get the generated ID
        const studio = await studioRepo.create({
          data: {
            ...createStudioDto,
            logoUrl: normalizedLogoUrl,
            photos: normalizedPhotos,
            reminderSettings,
            ...descriptionTranslations,
            latitude,
            longitude,
            ownerId: userId,
            status: 'DRAFT', // Set to DRAFT after complete setup
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
            workingHours: true,
            reminderSettings: true,
            ownerId: true,
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

        // Create default FREE subscription for each new studio.
        const now = new Date();

        await tx.subscription.create({
          data: {
            studioId: studio.id,
            type: 'FREEMIUM',
            status: 'ACTIVE',
            startDate: now,
            amount: 0.0,
            updatedAt: now,
          },
        });

        // Generate and update slug using the actual Studio ID
        const slug = generateStudioSlug(
          studio.name,
          studio.id,
          studio.address || undefined,
        );

        // Update Studio with generated slug
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

      // Add derived categories from services
      // Note: result.Service is an array from Prisma include (may be empty for new Studio)
      const services =
        (result as any).Service || (result as any).Training || [];
      const serviceCategoryIds = Array.from(
        new Set(
          services.map((s: any) => s?.trainingCategoryId).filter(Boolean),
        ),
      );
      (result as any).categories = serviceCategoryIds;

      // Transform Service array to services for consistency
      (result as any).services = services;

      console.log(
        `✅ Created Studio "${result.name}" with default FREEMIUM subscription`,
      );
      this.analytics.track(userId, 'studio_created', {
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
      select: {
        id: true,
        name: true,
        address: true,
        descriptionEn: true,
        descriptionVi: true,
        descriptionRu: true,
      },
    });

    if (!existingStudio) {
      throw new Error('Studio not found');
    }

    const normalizedPhotos =
      updateStudioDto.photos !== undefined
        ? this.normalizeStudioPhotos(updateStudioDto.photos)
        : undefined;
    const normalizedLogoUrl =
      updateStudioDto.logoUrl !== undefined
        ? this.normalizeStudioLogoUrl(updateStudioDto.logoUrl)
        : undefined;

    // Generate new slug if name or address changed
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
      ...(updateStudioDto.reminderSettings !== undefined
        ? {
            reminderSettings: this.normalizeReminderSettings(
              updateStudioDto.reminderSettings,
            ),
          }
        : {}),
    };

    // Geocode address if provided and coordinates not provided
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
        // Continue without coordinates
      }
    }

    // Generate translations for description only if it changed
    let descriptionTranslations: {
      descriptionEn?: string;
      descriptionVi?: string;
      descriptionRu?: string;
    } = {};

    if (updateStudioDto.description && updateStudioDto.description.trim()) {
      const newDescription = updateStudioDto.description.trim();

      // Check if description actually changed by comparing with existing translations
      const descriptionChanged =
        newDescription !== existingStudio.descriptionEn?.trim() &&
        newDescription !== existingStudio.descriptionVi?.trim() &&
        newDescription !== existingStudio.descriptionRu?.trim();

      if (descriptionChanged) {
        try {
          console.log(
            '🌐 Generating translations for updated Studio description...',
          );
          const translations =
            await this.translationService.generateDescriptionTranslations(
              newDescription,
            );
          descriptionTranslations = {
            descriptionEn: translations.descriptionEn || undefined,
            descriptionVi: translations.descriptionVi || undefined,
            descriptionRu: translations.descriptionRu || undefined,
          };
          console.log('✅ Translations generated for update');
        } catch (error) {
          console.error(
            '⚠️ Failed to generate description translations:',
            error,
          );
          // Continue without translations
        }
      } else {
        console.log(
          'ℹ️ Description unchanged, skipping translation generation',
        );
      }
    }

    const updatedStudio = await studioRepo.update({
      where: { id: existingStudio.id },
      data: {
        ...StudioData,
        ...descriptionTranslations,
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(slug && { slug }), // Update slug if generated
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

    // Add derived categories from services
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
          website: true,
          instagram: true,
          logoUrl: true,
          photos: true,
          workingHours: true,
          latitude: true,
          longitude: true,
          descriptionEn: true,
          descriptionVi: true,
          descriptionRu: true,
          slug: true,
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
              nameEn: true,
              nameVi: true,
              nameRu: true,
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
            },
          },
        },
      });

      if (!Studio) {
        return null;
      }

      // Transform Prisma response to frontend format
      const transformedStudio = {
        id: Studio.id,
        name: Studio.name,
        description: Studio.description,
        address: Studio.address,
        phone: Studio.phone,
        website: Studio.website,
        instagram: Studio.instagram,
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
            nameEn: service.nameEn,
            nameVi: service.nameVi,
            nameRu: service.nameRu,
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
        owner: (Studio as any).User
          ? {
              id: (Studio as any).User.id,
              name: (Studio as any).User.name,
              // Removed email - not used on frontend
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
                  nameEn: session.Training.nameEn,
                  nameVi: session.Training.nameVi,
                  nameRu: session.Training.nameRu,
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
            trainer: buildPublicTrainerPayload(
              session.Trainer,
              (Studio as any).User
                ? {
                    id: (Studio as any).User.id,
                    name: (Studio as any).User.name,
                    email: (Studio as any).User.email,
                  }
                : null,
            ),
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
      const Studio = await this.prisma.Studio.findUnique({
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
              Trainer: true,
            },
          },
          Training: {
            take: 50,
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
        staff: (Studio as any).Trainer || [],
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
            nameEn: service.nameEn,
            nameVi: service.nameVi,
            nameRu: service.nameRu,
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

  /** Same payload shape as findBySlug but without owner linkage, staff/reviewer PII, or reminder settings. */
  async findPublicBySlug(slug: string) {
    const full = await this.findBySlug(slug);
    if (!full) return null;
    const studio = full as Record<string, unknown>;
    delete studio.ownerId;
    delete studio.reminderSettings;
    const staff = studio.staff as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(staff)) {
      studio.staff = staff.map((s) => ({
        id: s.id,
        name: s.name,
        accessLevel: s.accessLevel,
      }));
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
        User: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    if (!studio || studio.status !== 'ACTIVE') {
      return [];
    }

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
            nameEn: true,
            nameVi: true,
            nameRu: true,
            description: true,
            descriptionEn: true,
            descriptionVi: true,
            descriptionRu: true,
            duration: true,
            price: true,
            trainingCategoryId: true,
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
      const locationName =
        locationCount > 1
          ? (resolveTrainingLocationName(
              studio.reminderSettings,
              s.locationId,
              studioName,
            ) ?? studioName)
          : null;

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
            nameEn: s.Training.nameEn,
            nameVi: s.Training.nameVi,
            nameRu: s.Training.nameRu,
            description: s.Training.description,
            descriptionEn: s.Training.descriptionEn,
            descriptionVi: s.Training.descriptionVi,
            descriptionRu: s.Training.descriptionRu,
            duration: s.Training.duration,
            price: s.Training.price,
            trainingCategoryId: s.Training.trainingCategoryId,
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
      trainer: buildPublicTrainerPayload(s.Trainer, studioOwner),
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
          photos: true, // Get all photos, but we'll only use the first one
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
      ratingMap: new Map<
        string,
        { avgRating: number; reviewCount: number }
      >(),
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
        tc.name_en?.trim() ||
        tc.name_ru?.trim() ||
        tc.name_vn?.trim() ||
        '';
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
        latitude: Studio.latitude ?? undefined,
        longitude: Studio.longitude ?? undefined,
        photos: Studio.photos,
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

  async findNearbyStudios(params: {
    lat?: number;
    lng?: number;
    radius: number;
    limit: number;
  }) {
    const { lat, lng, radius, limit } = params;

    // If no coordinates provided, return featured Studios
    if (lat == null || lng == null) {
      return this.findFeaturedStudios(limit);
    }

    // Get all Studios with coordinates
    const Studios = await this.prisma.Studio.findMany({
      where: {
        status: 'ACTIVE', // Only show active Studios
        latitude: { not: null },
        longitude: { not: null },
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
        reminderSettings: true,
        _count: {
          select: {
            Review: true,
            Booking: true,
          },
        },
      },
    });

    // Calculate distances and filter by radius
    const StudiosWithDistance = Studios.map((Studio) => {
      if (!Studio.latitude || !Studio.longitude) {
        return null;
      }
      const distance = this.calculateDistance(
        lat,
        lng,
        Studio.latitude,
        Studio.longitude,
      );
      return {
        ...Studio,
        distance,
      };
    })
      .filter(
        (Studio): Studio is NonNullable<typeof Studio> =>
          Studio !== null && Studio.distance <= radius,
      )
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    // Fallback for MVP: if no Studios in selected radius, return featured list
    // so client map/home are not empty for new regions with sparse data.
    if (StudiosWithDistance.length === 0) {
      return this.findFeaturedStudios(limit);
    }

    const nearbyIds = StudiosWithDistance.map((s) => s.id);
    const { ratingMap, categoriesByStudio, categoryIdsByStudio } =
      await this.getStudioDiscoveryMeta(nearbyIds);

    return StudiosWithDistance.map((s) => {
      const r = ratingMap.get(s.id) || { avgRating: 0, reviewCount: 0 };
      const studioName = resolveStudioBrandNameForDiscovery({
        name: s.name,
        slug: s.slug,
        reminderSettings: s.reminderSettings,
      });
      return {
        id: s.id,
        name: studioName,
        studioName,
        address: s.address,
        latitude: s.latitude ?? undefined,
        longitude: s.longitude ?? undefined,
        photos: s.photos,
        logoUrl: s.logoUrl,
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
}
