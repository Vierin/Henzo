import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TrainersService } from './trainers.service';
import { AuthService } from '../auth/auth.service';
import { Public } from '../auth/public.decorator';

@Controller('trainers')
export class TrainersController {
  constructor(
    private readonly trainersService: TrainersService,
    private readonly authService: AuthService,
  ) {}

  private async includePrivateTrainerFields(
    authHeader: string | undefined,
    studioId: string,
  ): Promise<boolean> {
    if (!authHeader?.trim()) return false;
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);
      if (currentUser.user.role !== 'OWNER') return false;
      return this.trainersService.isStudioOwnedByOwner(
        studioId,
        currentUser.user.id,
      );
    } catch {
      return false;
    }
  }

  @Public()
  @Get()
  async getTrainersByStudio(
    @Query('studioId') studioId: string,
    @Headers('authorization') authHeader?: string,
  ) {
    if (!studioId) {
      throw new Error('Studio ID is required');
    }
    const includePrivate = await this.includePrivateTrainerFields(
      authHeader,
      studioId,
    );
    return this.trainersService.findByStudioId(studioId, includePrivate);
  }

  @Public()
  @Get('invite/:token')
  async getInviteInfo(@Param('token') token: string) {
    return this.trainersService.getInviteInfo(token);
  }

  @Get('me/profile')
  async getMyTrainerProfile(@Headers('authorization') authHeader: string) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    return this.trainersService.getTrainerByUserId(currentUser.user.id);
  }

  @Public()
  @Get(':id')
  async getTrainerById(
    @Param('id') id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const studioId = await this.trainersService.findTrainerStudioId(id);
    const includePrivate =
      studioId != null &&
      (await this.includePrivateTrainerFields(authHeader, studioId));
    return this.trainersService.findTrainerById(id, includePrivate);
  }

  @Post()
  async createTrainer(
    @Headers('authorization') authHeader: string,
    @Body()
    data: {
      name: string;
      email?: string;
      phone?: string;
      accessLevel: 'ADMIN' | 'EMPLOYEE';
      studioId: string;
      trainingIds?: string[];
    },
  ) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    if (currentUser.user.role !== 'OWNER') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const isOwner = await this.trainersService.isStudioOwnedByOwner(
      data.studioId,
      currentUser.user.id,
    );
    if (!isOwner) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    return this.trainersService.createTrainer(data);
  }

  @Put(':id')
  async updateTrainer(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      email?: string;
      phone?: string;
      accessLevel?: 'ADMIN' | 'EMPLOYEE';
      trainingIds?: string[];
    },
  ) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    if (currentUser.user.role !== 'OWNER') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const studioId = await this.trainersService.findTrainerStudioId(id);
    if (!studioId) {
      throw new HttpException('Trainer not found', HttpStatus.NOT_FOUND);
    }
    const isOwner = await this.trainersService.isStudioOwnedByOwner(
      studioId,
      currentUser.user.id,
    );
    if (!isOwner) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    return this.trainersService.updateTrainer(id, data);
  }

  // ── Invite endpoints ─────────────────────────────────────────

  /** Generate (or refresh) an invite link for a trainer (Studio+ owners only). */
  @Post(':id/invite')
  async generateInvite(
    @Headers('authorization') authHeader: string,
    @Param('id') trainerId: string,
    @Body() body: { sendToEmail?: string },
  ) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    if (currentUser.user.role !== 'OWNER') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    return this.trainersService.generateInvite(
      trainerId,
      currentUser.user.id,
      body?.sendToEmail,
    );
  }

  /** Authenticated trainer accepts the invite and gets linked to the Trainer record. */
  @Post('invite/:token/accept')
  async acceptInvite(
    @Headers('authorization') authHeader: string,
    @Param('token') token: string,
  ) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    return this.trainersService.acceptInvite(
      token,
      currentUser.user.id,
      currentUser.user.email,
    );
  }

  @Delete(':id')
  async deleteTrainer(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    if (currentUser.user.role !== 'OWNER') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const studioId = await this.trainersService.findTrainerStudioId(id);
    if (!studioId) {
      throw new HttpException('Trainer not found', HttpStatus.NOT_FOUND);
    }
    const isOwner = await this.trainersService.isStudioOwnedByOwner(
      studioId,
      currentUser.user.id,
    );
    if (!isOwner) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    return this.trainersService.deleteTrainer(id);
  }
}
