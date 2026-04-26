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
import { TrainingsService } from './trainings.service';
import { TranslationService } from './translation.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { AuthService } from '../auth/auth.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Controller('trainings')
export class TrainingsController {
  constructor(
    private readonly trainingsService: TrainingsService,
    private readonly translationService: TranslationService,
    private readonly authService: AuthService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get()
  async getTrainingsByStudio(@Query('studioId') studioId: string) {
    if (!studioId) {
      throw new Error('Studio ID is required');
    }
    return this.trainingsService.findByStudioId(studioId);
  }

  @Get('public')
  async getPublicTrainings() {
    return this.trainingsService.findAllPublicTrainings();
  }

  @Get('popular')
  async getPopularTrainings(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.trainingsService.findPopularServices(limitNum);
  }

  @Get('trending')
  async getTrendingTrainings(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 8;
    return this.trainingsService.findTrendingServices(limitNum);
  }

  @Get('categories')
  async getTrainingCategories() {
    return this.trainingsService.getServiceCategories();
  }

  @Get('search')
  async searchTrainings(@Query('q') query: string) {
    if (!query || query.trim().length < 3) {
      return {
        success: true,
        data: [],
      };
    }

    try {
      const results = await this.trainingsService.searchServices(query);
      return {
        success: true,
        data: results,
      };
    } catch (error) {
      console.error('❌ Service search error:', error);
      return {
        success: false,
        error: 'Failed to search services',
        data: [],
      };
    }
  }

  @Post('translate')
  async generateTranslations(
    @Body()
    body: {
      name: string;
      description?: string;
      sourceLanguage?: 'en' | 'vi' | 'ru';
    },
  ) {
    const { name, description = '', sourceLanguage } = body;

    if (!name || !name.trim()) {
      throw new Error('Name is required');
    }

    // sourceLanguage is optional - will be auto-detected if not provided
    const translations =
      await this.translationService.generateServiceTranslations(
        name,
        description,
        sourceLanguage,
      );

    return translations;
  }

  @Get(':id')
  async getTrainingById(@Param('id') id: string) {
    return this.trainingsService.findTrainingById(id);
  }

  @Post()
  async createTraining(
    @Headers('authorization') authHeader: string,
    @Body() createServiceDto: CreateServiceDto,
  ) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    if (currentUser.user.role !== 'OWNER') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    await this.subscriptionsService.assertSalonOwnerMayExpandConfiguration(
      currentUser.user.id,
      createServiceDto.salonId,
    );
    return this.trainingsService.createTraining({
      ...createServiceDto,
      studioId: createServiceDto.salonId,
      trainerIds: createServiceDto.staffIds,
    });
  }

  @Put(':id')
  async updateTraining(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.trainingsService.updateTraining(id, {
      ...updateServiceDto,
      trainerIds: updateServiceDto.staffIds,
    });
  }

  @Delete(':id')
  async deleteTraining(@Param('id') id: string) {
    return this.trainingsService.deleteTraining(id);
  }

  // --- Service groups ---
  @Get('groups/by-salon')
  async getGroupsBySalon(@Query('salonId') salonId: string) {
    if (!salonId) {
      throw new Error('Salon ID is required');
    }
    return this.trainingsService.findGroupsBySalon(salonId);
  }

  @Get('groups/by-studio')
  async getGroupsByStudio(@Query('studioId') studioId: string) {
    if (!studioId) {
      throw new Error('Studio ID is required');
    }
    return this.trainingsService.findGroupsBySalon(studioId);
  }

  @Post('groups')
  async createGroup(
    @Headers('authorization') authHeader: string,
    @Body()
    body: {
      salonId: string;
      name: string;
      nameEn?: string;
      nameVi?: string;
      nameRu?: string;
    },
  ) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    if (currentUser.user.role !== 'OWNER') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    await this.subscriptionsService.assertSalonOwnerMayExpandConfiguration(
      currentUser.user.id,
      body.salonId,
    );
    return this.trainingsService.createGroup(body);
  }

  @Put('groups/:id')
  async updateGroup(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      nameEn?: string;
      nameVi?: string;
      nameRu?: string;
      position?: number;
      isActive?: boolean;
    },
  ) {
    return this.trainingsService.updateGroup(id, body);
  }

  @Delete('groups/:id')
  async deleteGroup(@Param('id') id: string) {
    return this.trainingsService.deleteGroup(id);
  }
}
