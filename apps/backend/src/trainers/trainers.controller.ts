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

@Controller('trainers')
export class TrainersController {
  constructor(
    private readonly trainersService: TrainersService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async getTrainersByStudio(@Query('studioId') studioId: string) {
    if (!studioId) {
      throw new Error('Studio ID is required');
    }
    return this.trainersService.findByStudioId(studioId);
  }

  @Get(':id')
  async getTrainerById(@Param('id') id: string) {
    return this.trainersService.findTrainerById(id);
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
