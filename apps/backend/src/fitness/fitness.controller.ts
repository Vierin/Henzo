import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { SalonsService } from '../salons/salons.service';
import { ServicesService } from '../services/services.service';
import { StaffService } from '../staff/staff.service';
import { BookingsService } from '../bookings/bookings.service';
import { AuthService } from '../auth/auth.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateServiceDto } from '../services/dto/create-service.dto';
import { UpdateServiceDto } from '../services/dto/update-service.dto';
import { CreateBookingDto } from '../bookings/dto/create-booking.dto';

@Controller('fitness')
export class FitnessController {
  constructor(
    private readonly salonsService: SalonsService,
    private readonly servicesService: ServicesService,
    private readonly staffService: StaffService,
    private readonly bookingsService: BookingsService,
    private readonly authService: AuthService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  // ---- Studios (alias of salons) ----
  @Get('studios/featured')
  async getFeaturedStudios(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 6;
    return this.salonsService.findFeaturedSalons(limitNum);
  }

  @Get('studios/search')
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
  ) {
    return this.salonsService.searchSalons({
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
    });
  }

  @Get('studios/categories')
  async getStudioCategories() {
    return this.salonsService.getSalonCategories();
  }

  @Get('studios/current')
  async getCurrentStudio(@Headers('authorization') authHeader: string) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    const data = await this.salonsService.getCurrentUserSalon(currentUser.user.id);
    return { success: !!data, data };
  }

  // ---- Offerings (alias of services) ----
  @Get('offerings')
  async getOfferingsByStudio(@Query('studioId') studioId: string) {
    return this.servicesService.findBySalonId(studioId);
  }

  @Get('offerings/popular')
  async getPopularOfferings(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.servicesService.findPopularServices(limitNum);
  }

  @Get('offerings/categories')
  async getOfferingCategories() {
    return this.servicesService.getServiceCategories();
  }

  @Post('offerings')
  async createOffering(
    @Headers('authorization') authHeader: string,
    @Body() dto: CreateServiceDto,
  ) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    await this.subscriptionsService.assertSalonOwnerMayExpandConfiguration(
      currentUser.user.id,
      dto.salonId,
    );
    return this.servicesService.create(dto);
  }

  @Put('offerings/:id')
  async updateOffering(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.update(id, dto);
  }

  // ---- Trainers (alias of staff) ----
  @Get('trainers')
  async getTrainers(@Query('studioId') studioId: string) {
    return this.staffService.findBySalonId(studioId);
  }

  @Post('trainers')
  async createTrainer(
    @Headers('authorization') authHeader: string,
    @Body()
    data: {
      name: string;
      email?: string;
      phone?: string;
      accessLevel: 'ADMIN' | 'EMPLOYEE';
      salonId: string;
      serviceIds?: string[];
    },
  ) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    await this.subscriptionsService.assertSalonOwnerMayExpandConfiguration(
      currentUser.user.id,
      data.salonId,
    );
    return this.staffService.create(data);
  }

  // ---- Session bookings (alias of bookings) ----
  @Post('session-bookings')
  async createSessionBooking(
    @Body() data: CreateBookingDto,
    @Headers('authorization') authHeader: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    const locale = acceptLanguage?.toLowerCase().includes('ru')
      ? 'ru'
      : acceptLanguage?.toLowerCase().includes('vi')
        ? 'vi'
        : 'en';

    const booking = await this.bookingsService.createBooking(
      data,
      currentUser.user.id,
      currentUser.user.role === 'OWNER',
      locale,
    );
    return { success: true, booking };
  }

  @Get('session-bookings/owner')
  async getOwnerSessionBookings(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
  ) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    return this.bookingsService.getOwnerBookings(currentUser.user.id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 1500,
      status,
      date,
    });
  }
}
