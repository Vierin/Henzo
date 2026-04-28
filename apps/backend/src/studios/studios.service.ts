import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { CreateStudioDto } from './dto/create-studio.dto';
import { MapboxService } from '../mapbox/mapbox.service';
import { TranslationService } from '../trainings/translation.service';
import { generateStudioSlug } from '../utils/slug';
import { nanoid } from 'nanoid';

@Injectable()
export class StudiosService {
  private static readonly MAX_STUDIO_PHOTOS = 5;

  constructor(
    @Inject(PrismaService) private prisma: any,
    private mapboxService: MapboxService,
    private translationService: TranslationService,
  ) {}

  private normalizeReminderSettings(input: any): Record<string, unknown> {
    const base = input && typeof input === 'object' ? { ...input } : {};
    const raw = (base as Record<string, unknown>)['bookingPeriodDays'];
    let parsed = 14;
    if (typeof raw === 'number') parsed = Math.floor(raw);
    if (typeof raw === 'string') parsed = Number.parseInt(raw, 10) || 14;
    if (Number.isNaN(parsed)) parsed = 14;
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
    /** Comma-separated main category slugs (e.g. hair-barber,massage-spa) for map filters */
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

    // Build where clause
    const where: any = {
      status: 'ACTIVE', // Only show active Studios in public search
    };

    // Build category service filter first (needed for combining with search)
    let categoryServiceFilter: any = null;
    const csvSlugs = categoriesCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (csvSlugs.length > 0) {
      const mainCats = this.getStudioCategories().filter((c) =>
        csvSlugs.includes(c.slug),
      );
      if (mainCats.length > 0) {
        categoryServiceFilter = {
          trainingCategory: {
            main_category_id: { in: mainCats.map((c) => c.id) },
          },
        };
      }
    } else if (category && category !== 'all') {
      const categoryId = parseInt(category, 10);

      if (!Number.isNaN(categoryId)) {
        // Numeric ID - treat as trainingCategoryId for backward compatibility
        categoryServiceFilter = { trainingCategoryId: categoryId };
      } else {
        // String - check if it's a main category slug (e.g., "hair-barber", "massage-spa")
        const mainCategories = this.getStudioCategories();
        const mainCategory = mainCategories.find(
          (cat) => cat.slug === category,
        );

        if (mainCategory) {
          // Filter by main_category_id through trainingCategory JOIN
          categoryServiceFilter = {
            trainingCategory: {
              main_category_id: mainCategory.id,
            },
          };
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

    // Location filter - check cities table first
    if (location.trim()) {
      const normalizedLocation = this.normalizeLocationForSearch(
        location.trim(),
      );

      // Try to find city in cities table
      const city = await this.prisma.city.findFirst({
        where: {
          isActive: true,
          name: {
            equals: normalizedLocation,
            mode: 'insensitive',
          },
        },
      });

      // Create location variations for better matching
      const locationVariations = new Set<string>();
      locationVariations.add(normalizedLocation);
      locationVariations.add(location.trim());

      // If city found in table, add its name to variations
      if (city) {
        locationVariations.add(city.name);
      }

      // Add Vietnamese-English name variations for major cities
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

      // If city found and has coordinates, also search by proximity
      if (city && city.lat && city.lng) {
        // For now, we'll use address matching
        // TODO: Add geospatial search if needed (requires PostGIS)
      }

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

  // Single source of truth for Studio categories
  getStudioCategories() {
    return [
      {
        id: 1,
        name: 'Strength & Conditioning',
        slug: 'strength-conditioning',
      },
      {
        id: 2,
        name: 'Cardio & HIIT',
        slug: 'cardio-hiit',
      },
      {
        id: 3,
        name: 'Yoga & Mobility',
        slug: 'yoga-mobility',
      },
      {
        id: 4,
        name: 'Pilates',
        slug: 'pilates',
      },
      {
        id: 5,
        name: 'Personal Training',
        slug: 'personal-training',
      },
      {
        id: 6,
        name: 'Recovery & Rehab',
        slug: 'recovery-rehab',
      },
    ];
  }

  async getCurrentUserStudio(userId: string) {
    console.log('🔍 Looking for studio for user:', userId);
    const studioRepo = this.prisma.studio ?? this.prisma.salon;
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
            Training: true,
            Trainer: true,
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

        // Create FREEMIUM subscription with 3-month trial for the new Studio
        const now = new Date();
        const trialEndDate = new Date();
        trialEndDate.setMonth(now.getMonth() + 3); // 3 months trial
        const oneMonthFromTrialEnd = new Date(trialEndDate);
        oneMonthFromTrialEnd.setMonth(trialEndDate.getMonth() + 1);

        await tx.subscription.create({
          data: {
            studioId: studio.id,
            type: 'FREEMIUM',
            status: 'ACTIVE',
            startDate: now,
            endDate: oneMonthFromTrialEnd,
            nextPaymentDate: oneMonthFromTrialEnd,
            trialEndDate: trialEndDate,
            amount: 0.0, // Free during trial
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
        `✅ Created Studio "${result.name}" with FREEMIUM subscription and 3-month trial`,
      );
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
              // Removed email - not used on frontend
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

  async findFeaturedStudios(limit: number) {
    // Get Studios with minimal data
    const Studios = await this.prisma.Studio.findMany({
      where: {
        status: 'ACTIVE', // Only show active Studios in featured listings
      },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        photos: true,
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

    // Calculate average ratings using aggregate (much faster than loading all reviews)
    const ratingAggregates = await this.prisma.review.groupBy({
      by: ['studioId'],
      where: {
        studioId: { in: StudioIds },
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    // Get unique categories from trainings (only need category names and IDs)
    const categoryData = await this.prisma.service.findMany({
      where: {
        studioId: { in: StudioIds },
        trainingCategoryId: { not: null },
      },
      select: {
        studioId: true,
        trainingCategoryId: true,
        trainingCategory: {
          select: {
            name_en: true,
            name_vn: true,
            main_category_id: true,
          },
        },
      },
      distinct: ['studioId', 'trainingCategoryId'],
    });

    // Create maps for quick lookup
    const ratingMap = new Map<
      string,
      { avgRating: number; reviewCount: number }
    >(
      ratingAggregates.map((agg) => [
        agg.studioId,
        {
          avgRating: agg._avg.rating || 0,
          reviewCount: agg._count.rating,
        },
      ]),
    );

    // Group categories by studioId (names, leaf training category IDs, main category IDs)
    const categoryMap = new Map<string, Set<string>>();
    const categoryIdsMap = new Map<string, Set<number>>();
    const mainCategoryIdsMap = new Map<string, Set<number>>();
    categoryData.forEach((item) => {
      if (!item.trainingCategory || !item.trainingCategoryId) return;
      const categoryName =
        item.trainingCategory.name_en || item.trainingCategory.name_vn;
      if (!categoryName) return;

      if (!categoryMap.has(item.studioId)) {
        categoryMap.set(item.studioId, new Set());
        categoryIdsMap.set(item.studioId, new Set());
        mainCategoryIdsMap.set(item.studioId, new Set());
      }
      categoryMap.get(item.studioId)?.add(categoryName);
      categoryIdsMap.get(item.studioId)?.add(item.trainingCategoryId);
      const mid = item.trainingCategory.main_category_id;
      if (mid != null) {
        mainCategoryIdsMap.get(item.studioId)?.add(mid);
      }
    });

    // Enrich Studios with aggregated data
    const enriched = Studios.map((Studio) => {
      const ratingData = ratingMap.get(Studio.id) || {
        avgRating: 0,
        reviewCount: 0,
      };

      const categories = Array.from(categoryMap.get(Studio.id) || []);
      const trainingCategoryIds = Array.from(
        categoryIdsMap.get(Studio.id) || [],
      );
      const mainCategoryIds = Array.from(
        mainCategoryIdsMap.get(Studio.id) || [],
      );

      return {
        id: Studio.id,
        name: Studio.name,
        address: Studio.address,
        latitude: Studio.latitude ?? undefined,
        longitude: Studio.longitude ?? undefined,
        photos: Studio.photos,
        avgRating: Math.round(ratingData.avgRating * 10) / 10, // Round to 1 decimal
        categories,
        trainingCategoryIds,
        mainCategoryIds,
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
    if (!lat || !lng) {
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
        address: true,
        latitude: true,
        longitude: true,
        photos: true,
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

    return StudiosWithDistance;
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
      this.prisma.service.findMany({
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
