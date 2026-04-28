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

@Controller('trainings')
export class TrainingsController {
  constructor(
    private readonly trainingsService: TrainingsService,
    private readonly translationService: TranslationService,
    private readonly authService: AuthService,
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
    return this.trainingsService.getTrainingCategories();
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
    const isOwner = await this.trainingsService.isStudioOwnedByOwner(
      createServiceDto.studioId,
      currentUser.user.id,
    );
    if (!isOwner) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const createBody = createServiceDto as CreateServiceDto & {
      serviceCategoryId?: number;
    };
    return this.trainingsService.createTraining({
      ...createServiceDto,
      trainingCategoryId:
        createBody.trainingCategoryId ?? createBody.serviceCategoryId,
      trainerIds: createServiceDto.staffIds,
    });
  }

  @Put(':id')
  async updateTraining(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    if (currentUser.user.role !== 'OWNER') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const studioId = await this.trainingsService.findTrainingStudioId(id);
    if (!studioId) {
      throw new HttpException('Training not found', HttpStatus.NOT_FOUND);
    }
    const isOwner = await this.trainingsService.isStudioOwnedByOwner(
      studioId,
      currentUser.user.id,
    );
    if (!isOwner) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const updateBody = updateServiceDto as UpdateServiceDto & {
      serviceCategoryId?: number | null;
    };
    return this.trainingsService.updateTraining(id, {
      ...updateServiceDto,
      trainingCategoryId:
        updateBody.trainingCategoryId ?? updateBody.serviceCategoryId,
      trainerIds: updateServiceDto.staffIds,
    });
  }

  @Delete(':id')
  async deleteTraining(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    const currentUser = await this.authService.getCurrentUser(authHeader);
    if (currentUser.user.role !== 'OWNER') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const studioId = await this.trainingsService.findTrainingStudioId(id);
    if (!studioId) {
      throw new HttpException('Training not found', HttpStatus.NOT_FOUND);
    }
    const isOwner = await this.trainingsService.isStudioOwnedByOwner(
      studioId,
      currentUser.user.id,
    );
    if (!isOwner) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    return this.trainingsService.deleteTraining(id);
  }
}
