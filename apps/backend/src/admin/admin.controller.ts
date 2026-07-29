import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
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
import { CreateAdminBroadcastDto } from './dto/create-admin-broadcast.dto';
import { CreateAdminStudioDto } from './dto/create-admin-studio.dto';

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
    if (error instanceof UnauthorizedException) {
      throw new HttpException(error.message, HttpStatus.UNAUTHORIZED);
    }
    if (error instanceof ForbiddenException) {
      throw new HttpException(error.message, HttpStatus.FORBIDDEN);
    }
    const msg = error instanceof Error ? error.message : 'Request failed';
    throw new HttpException(msg, HttpStatus.BAD_REQUEST);
  }

  @Get('session')
  async session(@Headers('authorization') authHeader: string) {
    try {
      return { data: await this.adminService.verifySession(authHeader) };
    } catch (e) {
      this.handleError(e);
    }
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
    @Query('onboardingIncomplete') onboardingIncomplete?: string,
    @Query('unclaimed') unclaimed?: string,
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
          onboardingIncomplete === 'true',
          unclaimed === 'true',
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Post('studios')
  async createStudio(
    @Headers('authorization') authHeader: string,
    @Body() body: CreateAdminStudioDto,
  ) {
    try {
      return {
        data: await this.adminService.createUnclaimedStudio(authHeader, body),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('owners')
  async owners(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('onboarding') onboarding?: string,
  ) {
    try {
      const onboardingFilter =
        onboarding === 'complete' || onboarding === 'incomplete'
          ? onboarding
          : undefined;
      return {
        data: await this.adminService.listOwners(
          authHeader,
          parsePage(page),
          parseLimit(limit),
          search,
          onboardingFilter,
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('clients')
  async clientsDirectory(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('activityTier') activityTier?: string,
    @Query('hideAnonymous') hideAnonymous?: string,
  ) {
    try {
      return {
        data: await this.adminService.listDirectoryClients(
          authHeader,
          parsePage(page),
          parseLimit(limit),
          search,
          activityTier,
          hideAnonymous !== 'false',
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('trainers')
  async trainersDirectory(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    try {
      return {
        data: await this.adminService.listDirectoryTrainers(
          authHeader,
          parsePage(page),
          parseLimit(limit),
          search,
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

  @Post('studios/:id/publish')
  async publishStudio(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    try {
      return {
        data: await this.adminService.publishStudio(authHeader, id),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Post('studios/:id/photos')
  async uploadStudioPhoto(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body: { base64: string; contentType?: string; fileName?: string },
  ) {
    try {
      return {
        data: await this.adminService.uploadStudioPhoto(authHeader, id, body),
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

  @Post('studios/:id/claim-link')
  async requestStudioClaimLink(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() body?: { sendEmail?: boolean },
  ) {
    try {
      return {
        data: await this.adminService.requestStudioClaimLink(authHeader, id, {
          sendEmail: body?.sendEmail === true,
        }),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Delete('studios/:id')
  async deleteStudio(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    try {
      return {
        data: await this.adminService.deleteUnclaimedStudio(authHeader, id),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('studios/:id/pending-enrollments')
  async pendingStudioEnrollments(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    try {
      return {
        data: await this.adminService.listPendingStudioEnrollments(
          authHeader,
          id,
          parseLimit(limit),
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Post('studios/:id/pending-enrollments/:enrollmentId/confirm')
  async confirmPendingStudioEnrollment(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Param('enrollmentId') enrollmentId: string,
  ) {
    try {
      return {
        data: await this.adminService.confirmPendingStudioEnrollment(
          authHeader,
          id,
          enrollmentId,
        ),
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

  @Get('studios/:id/clients')
  async studioClients(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    try {
      return {
        data: await this.adminService.listStudioClients(
          authHeader,
          id,
          parsePage(page),
          parseLimit(limit),
          search,
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('studios/:id/visits')
  async studioVisits(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    try {
      return {
        data: await this.adminService.listStudioVisits(
          authHeader,
          id,
          parsePage(page),
          parseLimit(limit),
          status,
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('studios/:id/payment-events')
  async studioPaymentEvents(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    try {
      return {
        data: await this.adminService.getStudioPaymentEvents(
          authHeader,
          id,
          parseLimit(limit),
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('no-show-clients')
  async noShowClients(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('minNoShows') minNoShows?: string,
    @Query('days') days?: string,
  ) {
    try {
      const min = Number(minNoShows ?? '3');
      const windowDays = Number(days ?? '90');
      return {
        data: await this.adminService.listNoShowClients(
          authHeader,
          parsePage(page),
          parseLimit(limit),
          Number.isFinite(min) && min >= 1 ? Math.floor(min) : 3,
          Number.isFinite(windowDays) && windowDays >= 1
            ? Math.min(365, Math.floor(windowDays))
            : 90,
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('payments')
  async payments(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    try {
      return {
        data: await this.adminService.listPaymentEvents(
          authHeader,
          parsePage(page),
          parseLimit(limit),
          from,
          to,
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Post('broadcasts')
  async broadcast(
    @Headers('authorization') authHeader: string,
    @Body() body: CreateAdminBroadcastDto,
  ) {
    try {
      return {
        data: await this.adminService.sendBroadcast(authHeader, body),
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
