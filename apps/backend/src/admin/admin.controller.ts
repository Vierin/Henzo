import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateStudioDto } from '../studios/dto/update-studio.dto';
import { CreateServiceDto } from '../trainings/dto/create-service.dto';
import { UpdateServiceDto } from '../trainings/dto/update-service.dto';
import { CreateRecurringTrainingSessionsDto } from '../fitness/dto/create-recurring-training-sessions.dto';
import { PatchAdminSubscriptionDto } from './dto/patch-admin-subscription.dto';
import { CreateAdminTrainerDto } from './dto/create-admin-trainer.dto';
import { PatchAdminFeedbackDto } from './dto/patch-admin-feedback.dto';
import { UpdateAdminTrainerDto } from './dto/update-admin-trainer.dto';

function parsePage(v?: string): number {
  const n = Number(v ?? '1');
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function parseLimit(v?: string): number {
  const n = Number(v ?? '20');
  if (!Number.isFinite(n) || n < 1) return 20;
  return Math.min(100, Math.floor(n));
}

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private handleError(error: unknown): never {
    if (error instanceof ForbiddenException) {
      throw new HttpException(error.message, HttpStatus.FORBIDDEN);
    }
    const msg = error instanceof Error ? error.message : 'Request failed';
    throw new HttpException(msg, HttpStatus.BAD_REQUEST);
  }

  @Get('overview')
  async overview(@Headers('authorization') authHeader: string) {
    try {
      return { data: await this.adminService.getOverview(authHeader) };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('studios')
  async studios(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('activityTier') activityTier?: string,
  ) {
    try {
      return {
        data: await this.adminService.listStudios(
          authHeader,
          parsePage(page),
          parseLimit(limit),
          status,
          search,
          activityTier,
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('studios/:id')
  async studio(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    try {
      return { data: await this.adminService.getStudio(authHeader, id) };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('studios/:id/activity')
  async studioActivity(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    try {
      return {
        data: await this.adminService.getStudioActivity(authHeader, id),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('studios/:id/analytics')
  async studioAnalytics(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    try {
      return {
        data: await this.adminService.getStudioAnalytics(
          authHeader,
          id,
          from,
          to,
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Patch('studios/:id/profile')
  async patchStudioProfile(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: UpdateStudioDto,
  ) {
    try {
      return {
        data: await this.adminService.patchStudioProfile(authHeader, id, body),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('studios/:id/trainings')
  async studioTrainings(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    try {
      return {
        data: await this.adminService.listStudioTrainings(authHeader, id),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Post('studios/:id/trainings')
  async createStudioTraining(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: CreateServiceDto,
  ) {
    try {
      return {
        data: await this.adminService.createStudioTraining(
          authHeader,
          id,
          body,
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Patch('studios/:studioId/trainings/:trainingId')
  async updateStudioTraining(
    @Headers('authorization') authHeader: string,
    @Param('studioId') studioId: string,
    @Param('trainingId') trainingId: string,
    @Body() body: UpdateServiceDto,
  ) {
    try {
      return {
        data: await this.adminService.updateStudioTraining(
          authHeader,
          studioId,
          trainingId,
          body,
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('studios/:id/trainers')
  async studioTrainers(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    try {
      return {
        data: await this.adminService.listStudioTrainers(authHeader, id),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('studios/:id/bookings')
  async studioBookings(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Query('sort') sort?: string,
  ) {
    try {
      return {
        data: await this.adminService.listStudioBookings(authHeader, id, sort),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Post('studios/:id/trainers')
  async createStudioTrainer(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: CreateAdminTrainerDto,
  ) {
    try {
      return {
        data: await this.adminService.createStudioTrainer(authHeader, id, body),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Patch('studios/:studioId/trainers/:trainerId')
  async updateStudioTrainer(
    @Headers('authorization') authHeader: string,
    @Param('studioId') studioId: string,
    @Param('trainerId') trainerId: string,
    @Body() body: UpdateAdminTrainerDto,
  ) {
    try {
      return {
        data: await this.adminService.updateStudioTrainer(
          authHeader,
          studioId,
          trainerId,
          body,
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Post('studios/:id/training-sessions/recurring')
  async createStudioRecurringSessions(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: CreateRecurringTrainingSessionsDto,
  ) {
    try {
      return {
        data: await this.adminService.createStudioRecurringSessions(
          authHeader,
          id,
          body,
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('subscriptions')
  async subscriptions(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    try {
      return {
        data: await this.adminService.listSubscriptions(
          authHeader,
          parsePage(page),
          parseLimit(limit),
          status,
          type,
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Patch('subscriptions/:id')
  async patchSubscription(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: PatchAdminSubscriptionDto,
  ) {
    try {
      return {
        data: await this.adminService.patchSubscription(authHeader, id, body),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Post('subscriptions/:id/founder-program')
  async activateFounderProgram(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    try {
      return {
        data: await this.adminService.activateFounderProgram(authHeader, id),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('notifications')
  async notifications(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    try {
      return {
        data: await this.adminService.listNotifications(
          authHeader,
          parsePage(page),
          parseLimit(limit),
          type,
          from,
          to,
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('feedback')
  async feedback(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    try {
      return {
        data: await this.adminService.listFeedback(
          authHeader,
          parsePage(page),
          parseLimit(limit),
          status,
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Patch('feedback/:id')
  async patchFeedback(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: PatchAdminFeedbackDto,
  ) {
    try {
      return {
        data: await this.adminService.patchFeedback(authHeader, id, body),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('settings')
  async settings(@Headers('authorization') authHeader: string) {
    try {
      return { data: await this.adminService.getSettings(authHeader) };
    } catch (e) {
      this.handleError(e);
    }
  }
}
