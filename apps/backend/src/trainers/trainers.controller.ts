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
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Controller('trainers')
export class TrainersController {
  constructor(
    private readonly trainersService: TrainersService,
    private readonly authService: AuthService,
    private readonly subscriptionsService: SubscriptionsService,
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
    await this.subscriptionsService.assertSalonOwnerMayExpandConfiguration(
      currentUser.user.id,
      data.studioId,
    );
    return this.trainersService.createTrainer(data);
  }

  @Put(':id')
  async updateTrainer(
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
    return this.trainersService.updateTrainer(id, data);
  }

  @Delete(':id')
  async deleteTrainer(@Param('id') id: string) {
    return this.trainersService.deleteTrainer(id);
  }
}
