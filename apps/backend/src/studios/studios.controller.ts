import {
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Headers,
  Query,
  HttpException,
  HttpStatus,
  Header,
} from '@nestjs/common';
import { StudiosService } from './studios.service';
import { StudioClaimService } from './studio-claim.service';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { CreateStudioDto } from './dto/create-studio.dto';
import {
  CompleteStudioClaimDto,
  LookupStudioClaimDto,
  RequestStudioClaimDto,
  AcceptStudioClaimDto,
} from './dto/studio-claim.dto';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { Public } from '../auth/public.decorator';

@Controller('studios')
export class StudiosController {
  private getBookingPeriodDays(reminderSettings: unknown): number {
    const fallback = 30;
    if (!reminderSettings || typeof reminderSettings !== 'object') {
      return fallback;
    }
    const raw = (reminderSettings as Record<string, unknown>)[
      'bookingPeriodDays'
    ];
    let parsed: number | null = null;
    if (typeof raw === 'number') parsed = Math.floor(raw);
    if (typeof raw === 'string') parsed = Number.parseInt(raw, 10);
    if (!parsed || Number.isNaN(parsed)) return fallback;
    return Math.max(1, Math.min(60, parsed));
  }

  private getBookingCutoffDate(bookingPeriodDays: number): Date {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + bookingPeriodDays);
    cutoff.setHours(23, 59, 59, 999);
    return cutoff;
  }

  constructor(
    private readonly studiosService: StudiosService,
    private readonly studioClaimService: StudioClaimService,
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Public()
  @Get('with-services')
  @Header('Cache-Control', 'public, max-age=600') // P1: Кэш на 10 минут
  async getStudiosWithServices() {
    try {
      return await this.studiosService.findStudiosWithServices();
    } catch (error) {
      console.error('❌ Error getting Studios with services:', error);
      throw new HttpException(
        error.message || 'Failed to get Studios with services',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Get('search')
  @Header('Cache-Control', 'public, max-age=300') // P1: Кэш на 5 минут
  async searchStudios(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('location') location?: string,
    @Query('category') category?: string,
    @Query('categories') categories?: string,
    @Query('sortBy') sortBy?: string,
    @Query('minRating') minRating?: string,
    @Query('isOpenNow') isOpenNow?: string,
    @Query('date') date?: string,
    @Query('time') time?: string,
    @Query('north') north?: string,
    @Query('south') south?: string,
    @Query('east') east?: string,
    @Query('west') west?: string,
  ) {
    const params = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      location,
      category,
      categories,
      sortBy,
      minRating: minRating ? parseInt(minRating, 10) : undefined,
      isOpenNow: isOpenNow === 'true',
      date,
      time,
      north: north !== undefined ? parseFloat(north) : undefined,
      south: south !== undefined ? parseFloat(south) : undefined,
      east: east !== undefined ? parseFloat(east) : undefined,
      west: west !== undefined ? parseFloat(west) : undefined,
    };

    const result = await this.studiosService.searchStudios(params);
    return {
      success: true,
      ...result,
    };
  }

  // ── Studio claim (ops-created → real owner) ───────────────────

  @Public()
  @Post('claim/lookup')
  async lookupStudioClaim(@Body() body: LookupStudioClaimDto) {
    return this.studioClaimService.lookupByEmail(body.email);
  }

  @Public()
  @Get('claim/:token')
  async getStudioClaimPreview(@Param('token') token: string) {
    return this.studioClaimService.getClaimPreview(token);
  }

  @Public()
  @Post('claim/:token/confirm-booking')
  async confirmStudioClaimBooking(@Param('token') token: string) {
    return this.studioClaimService.confirmBookingViaToken(token);
  }

  @Public()
  @Post('claim/:token/complete')
  async completeStudioClaim(
    @Param('token') token: string,
    @Body() body: CompleteStudioClaimDto,
  ) {
    return this.studioClaimService.completeWithPassword(
      token,
      body.email,
      body.password,
      { confirmBooking: body.confirmBooking === true },
    );
  }

  @Post('claim/:token/accept')
  async acceptStudioClaim(
    @Headers('authorization') authHeader: string,
    @Param('token') token: string,
    @Body() body: AcceptStudioClaimDto,
  ) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    return this.studioClaimService.acceptClaim(
      token,
      currentUser.user.id,
      currentUser.user.email,
      { confirmBooking: body?.confirmBooking === true },
    );
  }

  @Post('claim/accept-pending')
  async acceptPendingStudioClaim(@Headers('authorization') authHeader: string) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    return this.studioClaimService.acceptPendingForUser(
      currentUser.user.id,
      currentUser.user.email,
    );
  }

  @Post(':id/claim/request')
  async requestStudioClaim(
    @Headers('authorization') authHeader: string,
    @Param('id') studioId: string,
    @Body() body: RequestStudioClaimDto,
  ) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    const role = String(currentUser.user.role || '').toUpperCase();
    if (role !== 'OWNER' && role !== 'ADMIN') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    return this.studioClaimService.requestClaim(studioId, body.ownerEmail, {
      createdBy: currentUser.user.id,
      sendEmail: body.sendEmail !== false,
      requireOwnership:
        role === 'OWNER' ? { userId: currentUser.user.id } : undefined,
    });
  }

  @Public()
  @Get('preview')
  @Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')
  async getStudiosPreview(
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('location') location?: string,
    @Query('featured') featured?: string,
  ) {
    const params = {
      limit: limit ? parseInt(limit, 10) : 20,
      page: page ? parseInt(page, 10) : 1,
      location,
      featured: featured === 'true',
    };

    return this.studiosService.findStudiosPreview(params);
  }

  @Public()
  @Get('featured')
  @Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')
  async getFeaturedStudios(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 6;
    return this.studiosService.findFeaturedStudios(limitNum);
  }

  @Public()
  @Get('nearby/map')
  @Header('Cache-Control', 'public, max-age=90, stale-while-revalidate=180')
  async getNearbyStudiosForMap(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
    @Query('limit') limit?: string,
    @Query('strict') strict?: string,
  ) {
    return this.studiosService.findNearbyStudiosForMap(
      this.parseNearbyStudiosQuery(lat, lng, radius, limit, strict),
    );
  }

  @Public()
  @Get('nearby')
  async getNearbyStudios(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
    @Query('limit') limit?: string,
    @Query('strict') strict?: string,
  ) {
    return this.studiosService.findNearbyStudios(
      this.parseNearbyStudiosQuery(lat, lng, radius, limit, strict),
    );
  }

  private parseNearbyStudiosQuery(
    lat?: string,
    lng?: string,
    radius?: string,
    limit?: string,
    strict?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return {
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radius: radius ? parseInt(radius, 10) : 50,
      limit: Math.min(Math.max(limitNum, 1), 100),
      strict: strict === 'true' || strict === '1',
    };
  }

  @Get(':id/stats')
  async getStudioStats(@Param('id') id: string) {
    return this.studiosService.getStudioStats(id);
  }

  @Get(':id/availability')
  async getStudioAvailability(
    @Param('id') id: string,
    @Query('date') date?: string,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.studiosService.getStudioAvailability(id, date, serviceId);
  }

  @Public()
  @Get('categories')
  @Header('Cache-Control', 'public, max-age=86400') // Cache for 24 hours - categories rarely change
  async getStudioCategories() {
    return await this.studiosService.getStudioCategories();
  }

  @Get('current')
  async getCurrentUserStudio(@Headers('authorization') authHeader: string) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);
      const result = await this.studiosService.getCurrentUserStudio(
        currentUser.user.id,
      );

      if (!result) {
        return { success: false, message: 'No Studio found for this user' };
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Get current Studio failed:', error.message);
      return { success: false, message: error.message };
    }
  }

  @Get('current/onboarding-checklist')
  async getCurrentUserStudioOnboardingChecklist(
    @Headers('authorization') authHeader: string,
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);
      const checklist =
        await this.studiosService.getCurrentUserStudioOnboardingChecklist(
          currentUser.user.id,
        );
      if (!checklist) {
        return { success: true, data: null, needsSetup: true };
      }
      return { success: true, data: checklist };
    } catch (error) {
      console.error(
        '❌ Get Studio onboarding checklist failed:',
        error.message,
      );
      throw new HttpException(
        error.message || 'Failed to get Studio onboarding checklist',
        error.message === 'Studio not found'
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('current')
  async createCurrentUserStudio(
    @Body() createStudioDto: CreateStudioDto,
    @Headers('authorization') authHeader: string,
  ) {
    try {
      console.log('📝 Received create studio request:', {
        hasAuthHeader: !!authHeader,
        dataKeys: Object.keys(createStudioDto),
      });

      const currentUser = await this.authService.getCurrentUser(authHeader);
      if (currentUser.user.role !== 'OWNER') {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }

      const result = await this.studiosService.createCurrentUserStudio(
        createStudioDto,
        currentUser.user.id,
      );

      console.log('✅ Studio created successfully:', result.id);
      return result;
    } catch (error) {
      console.error('❌ Create studio failed:', error.message);
      throw error;
    }
  }

  @Put('current')
  async updateCurrentUserStudio(
    @Body() updateStudioDto: UpdateStudioDto,
    @Headers('authorization') authHeader: string,
  ) {
    try {
      console.log('📝 Received update Studio request:', {
        hasAuthHeader: !!authHeader,
        dataKeys: Object.keys(updateStudioDto),
      });

      const currentUser = await this.authService.getCurrentUser(authHeader);
      if (currentUser.user.role !== 'OWNER') {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }

      const result = await this.studiosService.updateCurrentUserStudio(
        updateStudioDto,
        currentUser.user.id,
      );

      console.log('✅ Studio updated successfully:', result.id);
      return result;
    } catch (error) {
      console.error('❌ Update Studio failed:', error.message);
      throw error;
    }
  }

  @Public()
  @Get('public/slugs')
  @Header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200')
  async getPublicStudioSlugs() {
    try {
      return await this.studiosService.findPublicSlugsForSitemap();
    } catch (error) {
      console.error('❌ Error getting public Studio slugs:', error);
      throw new HttpException(
        'Failed to get Studio slugs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Get('public/by-slug/:slug')
  @Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')
  async getPublicStudioBySlug(@Param('slug') slug: string) {
    try {
      const result = await this.studiosService.findPublicBySlug(slug);
      if (!result) {
        throw new HttpException('Studio not found', HttpStatus.NOT_FOUND);
      }
      return result;
    } catch (error) {
      console.error('❌ Error getting public Studio by slug:', error);
      throw error;
    }
  }

  @Public()
  @Get('by-slug/:slug')
  @Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')
  async getStudioBySlug(@Param('slug') slug: string) {
    try {
      const result = await this.studiosService.findPublicBySlug(slug);
      if (!result) {
        throw new HttpException('Studio not found', HttpStatus.NOT_FOUND);
      }
      return result;
    } catch (error) {
      console.error('❌ Error getting Studio by slug:', error);
      throw error;
    }
  }

  @Public()
  @Get(':id/schedule')
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
  async getPublicStudioSchedule(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      return await this.studiosService.findPublicScheduleById(id, {
        fromIso: from,
        toIso: to,
        limit: limit ? parseInt(limit, 10) : 300,
      });
    } catch (error) {
      console.error('❌ Error getting public Studio schedule:', error);
      throw new HttpException(
        error.message || 'Failed to get Studio schedule',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('sessions/:sessionId/my-enrollment')
  async getMySessionEnrollment(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authHeader: string,
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);
      const userId = currentUser.user.id;
      const [row, waitlistEntry] = await Promise.all([
        this.prisma.sessionEnrollment.findUnique({
          where: { sessionId_userId: { sessionId, userId } },
          select: { id: true, status: true },
        }),
        this.prisma.waitlistEntry.findUnique({
          where: { sessionId_userId: { sessionId, userId } },
          select: { id: true },
        }),
      ]);
      return {
        enrolled: row?.status === 'ACTIVE',
        enrollmentId: row?.id ?? null,
        status: row?.status ?? null,
        waitlisted: !!waitlistEntry,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || 'Failed to load enrollment',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('sessions/:sessionId/book')
  async bookPublicStudioSession(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authHeader: string,
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);
      const userId = currentUser.user.id;
      if (currentUser.user.role === 'OWNER') {
        throw new HttpException(
          'Business accounts cannot book classes as clients',
          HttpStatus.FORBIDDEN,
        );
      }

      const session = await this.prisma.trainingSession.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          studioId: true,
          startsAt: true,
          endsAt: true,
          capacity: true,
          bookedCount: true,
          status: true,
          Studio: {
            select: {
              id: true,
              ownerId: true,
              name: true,
              reminderSettings: true,
              autoConfirmBookings: true,
              claimedAt: true,
              intendedOwnerEmail: true,
            },
          },
          Training: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!session || session.status !== 'ACTIVE') {
        throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
      }
      if (session.startsAt < new Date()) {
        throw new HttpException(
          'Session has already started',
          HttpStatus.BAD_REQUEST,
        );
      }
      const bookingPeriodDays = this.getBookingPeriodDays(
        session.Studio?.reminderSettings,
      );
      const bookingCutoffDate = this.getBookingCutoffDate(bookingPeriodDays);
      if (session.startsAt > bookingCutoffDate) {
        throw new HttpException(
          `Booking is allowed only up to ${bookingPeriodDays} days in advance`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const autoConfirm = session.Studio?.autoConfirmBookings !== false;
      const enrollmentStatus = autoConfirm ? 'ACTIVE' : 'PENDING';

      const existing = await this.prisma.sessionEnrollment.findFirst({
        where: {
          sessionId,
          userId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (existing?.status === 'ACTIVE' || existing?.status === 'PENDING') {
        throw new HttpException(
          'You are already booked for this class',
          HttpStatus.CONFLICT,
        );
      }

      if (session.bookedCount >= session.capacity) {
        throw new HttpException('No spots left', HttpStatus.BAD_REQUEST);
      }

      let enrollmentId = existing?.id ?? '';
      const booking = await this.prisma.$transaction(async (tx) => {
        const activeAgain = await tx.sessionEnrollment.findFirst({
          where: {
            sessionId,
            userId,
            status: { in: ['ACTIVE', 'PENDING'] },
          },
          select: { id: true },
        });
        if (activeAgain) {
          throw new HttpException(
            'You are already booked for this class',
            HttpStatus.CONFLICT,
          );
        }

        // Atomically claim the open seat. Concurrent requests cannot both win.
        const claimedSeat = await tx.trainingSession.updateMany({
          where: {
            id: sessionId,
            status: 'ACTIVE',
            startsAt: { gt: new Date() },
            bookedCount: { lt: session.capacity },
          },
          data: { bookedCount: { increment: 1 } },
        });
        if (claimedSeat.count !== 1) {
          throw new HttpException('No spots left', HttpStatus.BAD_REQUEST);
        }

        if (existing) {
          await tx.sessionEnrollment.update({
            where: { id: existing.id },
            data: {
              status: enrollmentStatus,
              cancelledAt: null,
            },
          });
          enrollmentId = existing.id;
        } else {
          try {
            const created = await tx.sessionEnrollment.create({
              data: {
                sessionId,
                userId,
                status: enrollmentStatus,
              },
              select: { id: true },
            });
            enrollmentId = created.id;
          } catch (createError: any) {
            if (createError?.code === 'P2002') {
              throw new HttpException(
                'You are already booked for this class',
                HttpStatus.CONFLICT,
              );
            }
            throw createError;
          }
        }

        // Only the winner leaves waitlist; everyone else stays for future
        // spot-open notifications until they leave or the session starts.
        const waitlistEntry = await tx.waitlistEntry.findUnique({
          where: { sessionId_userId: { sessionId, userId } },
          select: { id: true },
        });
        if (waitlistEntry) {
          await tx.waitlistEntry.delete({ where: { id: waitlistEntry.id } });
          await tx.trainingSession.update({
            where: { id: sessionId },
            data: { waitlistCount: { decrement: 1 } },
          });
        }

        return tx.trainingSession.findUniqueOrThrow({
          where: { id: sessionId },
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            bookedCount: true,
            capacity: true,
          },
        });
      });

      try {
        if (enrollmentId && enrollmentStatus === 'ACTIVE') {
          await this.notificationsService.schedulePreClassReminders(
            enrollmentId,
            userId,
          );
        }
      } catch (scheduleError) {
        console.error(
          '⚠️ Failed to schedule pre-class push reminders:',
          scheduleError,
        );
      }

      const isUnclaimedStudio =
        !session.Studio?.claimedAt && !!session.Studio?.intendedOwnerEmail;
      if (!isUnclaimedStudio) {
        try {
          await this.notificationsService.sendGroupClassBookingNotification({
            studioId: session.studioId,
            sessionId: session.id,
            enrollmentId,
            trainingName: session.Training?.name || 'class',
            startsAt: session.startsAt,
            clientName:
              currentUser.user.name || currentUser.user.email || 'Client',
          });
        } catch (pushError) {
          console.error('⚠️ Failed to send class booking push:', pushError);
        }
      }

      try {
        await this.studioClaimService.notifyOnBookingIfUnclaimed(
          session.studioId,
          {
            enrollmentId,
            sessionId: session.id,
            trainingName: session.Training?.name || 'class',
            clientName:
              currentUser.user.name || currentUser.user.email || 'Client',
            startsAt: session.startsAt,
          },
        );
      } catch (claimEmailError) {
        console.error(
          '⚠️ Failed to send studio claim booking email:',
          claimEmailError,
        );
      }

      this.analytics.track(userId, 'booking_created', {
        session_id: session.id,
        studio_id: session.studioId,
        training_id: session.Training?.id,
        source: 'client_self',
        enrollment_status: enrollmentStatus,
      });

      return {
        success: true,
        alreadyBooked: false,
        enrollmentId,
        booking: {
          sessionId: booking.id,
          status: enrollmentStatus,
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          bookedCount: booking.bookedCount,
          capacity: booking.capacity,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || 'Failed to book session',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('sessions/:sessionId/waitlist')
  async joinWaitlist(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authHeader: string,
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);
      const userId = currentUser.user.id;
      if (currentUser.user.role === 'OWNER') {
        throw new HttpException(
          'Business accounts cannot book classes as clients',
          HttpStatus.FORBIDDEN,
        );
      }

      const session = await this.prisma.trainingSession.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          status: true,
          capacity: true,
          bookedCount: true,
          startsAt: true,
        },
      });
      if (!session || session.status !== 'ACTIVE') {
        throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
      }
      if (session.startsAt < new Date()) {
        throw new HttpException(
          'Session has already started',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (session.bookedCount < session.capacity) {
        throw new HttpException(
          'Spots are still available — book directly',
          HttpStatus.BAD_REQUEST,
        );
      }

      const alreadyBooked = await this.prisma.sessionEnrollment.findFirst({
        where: { sessionId, userId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (alreadyBooked) {
        throw new HttpException(
          'You are already booked for this class',
          HttpStatus.CONFLICT,
        );
      }

      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.waitlistEntry.findUnique({
          where: { sessionId_userId: { sessionId, userId } },
          select: { id: true },
        });
        if (existing) return;

        await tx.waitlistEntry.create({
          data: { sessionId, userId },
        });
        await tx.trainingSession.update({
          where: { id: sessionId },
          data: { waitlistCount: { increment: 1 } },
        });
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error?.message || 'Failed to join waitlist',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('sessions/:sessionId/waitlist')
  async leaveWaitlist(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authHeader: string,
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);
      const userId = currentUser.user.id;

      const entry = await this.prisma.waitlistEntry.findUnique({
        where: { sessionId_userId: { sessionId, userId } },
        select: { id: true },
      });
      if (!entry) return { success: true };

      await this.prisma.$transaction(async (tx) => {
        await tx.waitlistEntry.delete({ where: { id: entry.id } });
        await tx.trainingSession.update({
          where: { id: sessionId },
          data: { waitlistCount: { decrement: 1 } },
        });
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error?.message || 'Failed to leave waitlist',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/reviews')
  async createClientStudioReview(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
    @Body()
    body: { rating: number; comment?: string; enrollmentId?: string },
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);
      return await this.studiosService.createClientStudioReview(
        currentUser.user.id,
        id,
        body ?? {},
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error?.message || 'Failed to submit review',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Public()
  @Get(':id')
  @Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')
  async getStudioById(@Param('id') id: string) {
    try {
      const result = await this.studiosService.findById(id);
      if (!result) {
        throw new HttpException('Studio not found', HttpStatus.NOT_FOUND);
      }
      return result;
    } catch (error) {
      console.error('❌ Error getting Studio by id:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to get Studio',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/publish')
  async publishStudio(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);

      // Verify Studio belongs to user
      const studio = await this.prisma.studio.findFirst({
        where: { id, ownerId: currentUser.user.id },
        select: { id: true, status: true },
      });

      if (!studio) {
        throw new HttpException('Studio not found', HttpStatus.NOT_FOUND);
      }

      const checklist = await this.studiosService.getStudioOnboardingChecklist(
        studio.id,
      );
      if (!checklist.canPublish) {
        throw new HttpException(
          {
            message: 'Studio is not ready for publish',
            missingRequiredSteps: checklist.missingRequiredSteps,
            checklist,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Update Studio status to ACTIVE
      const updatedStudio = await this.prisma.studio.update({
        where: { id },
        data: { status: 'ACTIVE' },
      });

      return updatedStudio;
    } catch (error) {
      console.error('❌ Error publishing Studio:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to publish Studio',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
