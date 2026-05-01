import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Headers,
  Query,
  Res,
  HttpException,
  HttpStatus,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { StudiosService } from './studios.service';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { CreateStudioDto } from './dto/create-studio.dto';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { generateStudioSlug } from '../utils/slug';

@Controller('studios')
export class StudiosController {
  private getBookingPeriodDays(reminderSettings: unknown): number {
    const fallback = 14;
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
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

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

  @Get('featured')
  @Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')
  async getFeaturedStudios(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 6;
    return this.studiosService.findFeaturedStudios(limitNum);
  }

  @Get('nearby')
  async getNearbyStudios(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
    @Query('limit') limit?: string,
  ) {
    const params = {
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radius: radius ? parseInt(radius, 10) : 50, // km - default 50km for MVP
      limit: limit ? parseInt(limit, 10) : 10,
    };

    return this.studiosService.findNearbyStudios(params);
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

  @Get('categories')
  @Header('Cache-Control', 'public, max-age=86400') // Cache for 24 hours - categories rarely change
  async getStudioCategories() {
    return this.studiosService.getStudioCategories();
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
      console.log('✅ User authenticated:', currentUser.user.email);

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
      console.log('✅ User authenticated:', currentUser.user.email);

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

  @Get('current/qr-pdf')
  async generateQRPDF(
    @Headers('authorization') authHeader: string,
    @Query('locale') locale: string = 'en',
    @Res() res: Response,
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);

      // Get user's Studio
      const studio = await this.prisma.studio.findFirst({
        where: { ownerId: currentUser.user.id },
        select: {
          id: true,
          slug: true,
          name: true,
          address: true,
          phone: true,
          email: true,
        },
      });

      if (!studio) {
        throw new HttpException('Studio not found', HttpStatus.NOT_FOUND);
      }

      // Use slug from DB or generate if not exists
      const baseUrl = process.env.FRONTEND_URL || 'https://henzo.app';
      const slug =
        studio.slug ||
        generateStudioSlug(studio.name, studio.id, studio.address || undefined);
      const studioUrl = `${baseUrl}/studio/${slug}`;

      // Generate QR code URL (increased size to match PDF display)
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(studioUrl)}`;

      // PDF translations based on locale
      const pdfTranslations: Record<
        string,
        {
          title1: string;
          title2: string;
          description: string;
          footer1: string;
          footer2: string;
        }
      > = {
        en: {
          title1: 'BOOK YOUR',
          title2: 'APPOINTMENT',
          description: 'Quick & easy in just a few steps!',
          footer1: 'Scan QR code',
          footer2: 'to book now!',
        },
        ru: {
          title1: 'ЗАПИШИТЕСЬ',
          title2: 'НА ПРИЕМ',
          description: 'Быстро и легко всего за несколько шагов!',
          footer1: 'Отсканируйте QR-код',
          footer2: 'чтобы записаться прямо сейчас!',
        },
        vi: {
          title1: 'ĐẶT LỊCH',
          title2: 'HẸN CỦA BẠN',
          description: 'Nhanh chóng & dễ dàng chỉ với vài thao tác!',
          footer1: 'Quét mã QR',
          footer2: 'để đặt lịch ngay!',
        },
      };

      // Get translations for the requested locale (default to 'en')
      const validLocale =
        locale && ['en', 'ru', 'vi'].includes(locale) ? locale : 'en';
      const translations =
        pdfTranslations[validLocale] || pdfTranslations['en'];

      // Dynamic import for Puppeteer to avoid issues
      const puppeteer = await import('puppeteer');

      // Launch Puppeteer
      // Use system Chromium if available (in Docker), otherwise use bundled browser
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      // Create HTML content for the PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            @page {
              margin: 0;
            }
            
            body {
              margin: 0;
              padding: 0;
              font-family: 'Quicksand', 'Helvetica', Arial, sans-serif;
              background-color: #F4EFEC;
              height: 90svh;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              padding: 40px;
            }
            
            .top-section {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              align-items: center;
              margin-top: 60px;
            }
            
            .business-name {
              font-size: 20px;
              color: #413E3B;
              margin-bottom: 25px;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 500;
            }
            
            .title-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-bottom: 50px;
            }
            
            .title-line {
              font-size: 64px;
              color: #413E3B;
              font-weight: 400;
              text-align: center;
              margin: 0;
              line-height: 1.2;
            }

            .title-description {
              font-size: 26px;
              color: #413E3B;
              font-weight: 400;
              text-align: center;
              margin: 0;
              margin-top: 20px;
              line-height: 1.2;
            }
            
            .qr-section {
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 40px;
              padding: 20px;
              border-radius: 15px;
              background-color: #fff;
            }
            
            .qr-code {
              width: 300px;
              height: 300px;
            }
            
            .contact-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-bottom: 60px;
            }
            
            .contact-item {
              display: flex;
              align-items: center;
              margin-bottom: 15px;
              justify-content: center;
            }
            
            .contact-icon {
              width: 30px;
              height: 30px;
              margin-right: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .contact-text {
              font-size: 24px;
              color:#413E3B;
              font-weight: normal;
            }
            
            .bottom-section {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            
            .footer-text {
              font-size: 28px;
              color:#413E3B;
              line-height: 1.25;
              text-align: center;
              font-weight: 400;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="top-section">
            
            <div class="title-section">
              <h1 class="title-line">${translations.title1}</h1>
              <h1 class="title-line">${translations.title2}</h1>
              <p class="title-description">${translations.description}</p>
            </div>
            
            <div class="qr-section">
              <img src="${qrCodeUrl}" alt="QR Code" class="qr-code" />
            </div>

            <div class="business-name">${studio.name?.toUpperCase() || ''}</div>
            
            <div class="contact-section">
              ${
                studio.phone
                  ? `
                <div class="contact-item">
                  <div class="contact-icon phone"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone-icon lucide-phone"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg></div>
                  <div class="contact-text">${studio.phone}</div>
                </div>
              `
                  : ''
              }
              
              ${
                studio.email
                  ? `
                <div class="contact-item">
                  <div class="contact-icon email"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone-icon lucide-phone"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg></div>
                  <div class="contact-text">${studio.email}</div>
                </div>
              `
                  : ''
              }
            </div>
          </div>
          
          <div class="bottom-section">
            <p class="footer-text">${translations.footer1}</p>
            <p class="footer-text">${translations.footer2}</p>
          </div>
        </body>
        </html>
      `;

      // Set the HTML content with longer timeout for images
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Wait for images to load
      await page.waitForSelector('img', { timeout: 10000 }).catch(() => {
        console.log('No images found or timeout waiting for images');
      });

      // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready');

      console.log('HTML content set, generating PDF...');
      console.log('QR Code URL:', qrCodeUrl);

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
        timeout: 30000, // 30 second timeout
      });

      console.log('PDF buffer size:', pdfBuffer.length);

      await browser.close();

      // Set headers for PDF viewing (inline instead of attachment)
      // Use res.end() instead of res.send() to avoid charset issues
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'inline; filename="studio-qr-code.pdf"',
      );
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.end(pdfBuffer);
    } catch (error) {
      console.error('Error generating PDF:', error);
      const message =
        error?.message?.includes("Executable doesn't exist") ||
        error?.message?.includes('Could not find Chromium')
          ? 'PDF export is not available on this server (Chromium not installed).'
          : 'Failed to generate PDF';
      throw new HttpException(message, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

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

  @Get('by-slug/:slug')
  @Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')
  async getStudioBySlug(@Param('slug') slug: string) {
    try {
      const result = await this.studiosService.findBySlug(slug);
      if (!result) {
        throw new HttpException('Studio not found', HttpStatus.NOT_FOUND);
      }
      return result;
    } catch (error) {
      console.error('❌ Error getting Studio by slug:', error);
      throw error;
    }
  }

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

  @Post('sessions/:sessionId/book')
  async bookPublicStudioSession(
    @Param('sessionId') sessionId: string,
    @Headers('authorization') authHeader: string,
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);
      const userId = currentUser.user.id;

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

      if (existing?.status === 'ACTIVE') {
        return {
          success: true,
          alreadyBooked: true,
          booking: {
            sessionId: session.id,
            status: 'ACTIVE',
            startsAt: session.startsAt,
            endsAt: session.endsAt,
            bookedCount: session.bookedCount,
            capacity: session.capacity,
          },
        };
      }

      if (session.bookedCount >= session.capacity) {
        throw new HttpException('No spots left', HttpStatus.BAD_REQUEST);
      }

      const booking = await this.prisma.$transaction(async (tx) => {
        if (existing) {
          await tx.sessionEnrollment.update({
            where: { id: existing.id },
            data: {
              status: 'ACTIVE',
              cancelledAt: null,
            },
          });
        } else {
          await tx.sessionEnrollment.create({
            data: {
              sessionId,
              userId,
              status: 'ACTIVE',
            },
          });
        }

        const updatedSession = await tx.trainingSession.update({
          where: { id: sessionId },
          data: {
            bookedCount: {
              increment: 1,
            },
          },
          select: {
            id: true,
            startsAt: true,
            endsAt: true,
            bookedCount: true,
            capacity: true,
          },
        });
        return updatedSession;
      });

      try {
        if (session.Studio?.ownerId) {
          const tokens = await this.notificationsService.getPushTokensByUserId(
            session.Studio.ownerId,
          );
          if (tokens.length > 0) {
            const title = 'New class booking';
            const body = `${currentUser.user.name || currentUser.user.email} booked ${session.Training?.name || 'a class'}`;
            await this.notificationsService.sendPushNotification(
              tokens,
              title,
              body,
              {
                type: 'NEW_CLASS_BOOKING',
                sessionId: session.id,
                studioId: session.studioId,
                trainingName: session.Training?.name || '',
                startsAt: session.startsAt.toISOString(),
                clientName:
                  currentUser.user.name || currentUser.user.email || 'Client',
              },
              undefined,
              'henzo_default',
            );
          }
        }
      } catch (pushError) {
        console.error('⚠️ Failed to send class booking push:', pushError);
      }

      return {
        success: true,
        alreadyBooked: false,
        booking: {
          sessionId: booking.id,
          status: 'ACTIVE',
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
