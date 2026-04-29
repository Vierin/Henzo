import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { StudiosService } from '../studios/studios.service';
import { AuthService } from '../auth/auth.service';
import { FitnessSessionsService } from './fitness-sessions.service';
import { StudioAnalyticsService } from './studio-analytics.service';
import { CreateRecurringTrainingSessionsDto } from './dto/create-recurring-training-sessions.dto';
import { UpdateOwnerTrainingSessionDto } from './dto/update-owner-training-session.dto';

@Controller('fitness')
export class FitnessController {
  constructor(
    private readonly studiosService: StudiosService,
    private readonly authService: AuthService,
    private readonly fitnessSessionsService: FitnessSessionsService,
    private readonly studioAnalyticsService: StudioAnalyticsService,
  ) {}

  // ---- Studios  ----
  @Get('studios/featured')
  async getFeaturedStudios(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 6;
    return this.studiosService.findFeaturedStudios(limitNum);
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
    return this.studiosService.searchStudios({
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
    return this.studiosService.getStudioCategories();
  }

  @Get('studios/current')
  async getCurrentStudio(@Headers('authorization') authHeader: string) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    const data = await this.studiosService.getCurrentUserStudio(
      currentUser.user.id,
    );
    return { success: true, data, needsSetup: !data };
  }

  /** Owner analytics for the current studio (period on session/booking startsAt). */
  @Get('studios/current/analytics')
  async getCurrentStudioAnalytics(
    @Headers('authorization') authHeader: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.studioAnalyticsService.getCurrentStudioAnalytics(
      authHeader,
      from,
      to,
    );
  }

  @Post('training-sessions/recurring')
  async createRecurringTrainingSessions(
    @Headers('authorization') authHeader: string,
    @Body() dto: CreateRecurringTrainingSessionsDto,
  ) {
    return this.fitnessSessionsService.createRecurringSessions(authHeader, dto);
  }

  @Get('owner/training-sessions')
  async getOwnerTrainingSessions(
    @Headers('authorization') authHeader: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.fitnessSessionsService.getOwnerSessions(authHeader, from, to);
  }

  /** 1:1 client bookings for the current studio (mobile owner clients list, dashboard). */
  @Get('session-bookings/owner')
  async getOwnerSessionBookings(
    @Headers('authorization') authHeader: string,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? parseInt(limit, 10) : 100;
    return this.fitnessSessionsService.getOwnerSessionBookings(
      authHeader,
      Number.isFinite(n) ? n : 100,
    );
  }

  @Get('client/schedule')
  async getClientSchedule(
    @Headers('authorization') authHeader: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.fitnessSessionsService.getClientSchedule(authHeader, from, to);
  }

  /** Update one scheduled session (time, trainer, status). Does not change the Training template. */
  @Patch('owner/training-sessions/:id')
  async updateOwnerTrainingSession(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() dto: UpdateOwnerTrainingSessionDto,
  ) {
    return this.fitnessSessionsService.updateOwnerTrainingSession(
      authHeader,
      id,
      dto,
    );
  }

  @Put('owner/training-sessions/:id/status')
  async updateOwnerTrainingSessionStatus(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED' },
  ) {
    return this.fitnessSessionsService.updateOwnerSessionStatus(
      authHeader,
      id,
      body.status,
    );
  }
}
