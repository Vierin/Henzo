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
import { ServicesService } from './services.service';
import { TranslationService } from './translation.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { AuthService } from '../auth/auth.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Controller('services')
export class ServicesController {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly translationService: TranslationService,
    private readonly authService: AuthService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get()
  async getServicesBySalon(@Query('salonId') salonId: string) {
    if (!salonId) {
      throw new Error('Salon ID is required');
    }
    return this.servicesService.findBySalonId(salonId);
  }

  @Get('public')
  async getPublicServices() {
    return this.servicesService.findAllPublic();
  }

  @Get('popular')
  async getPopularServices(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.servicesService.findPopularServices(limitNum);
  }

  @Get('trending')
  async getTrendingServices(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 8;
    return this.servicesService.findTrendingServices(limitNum);
  }

  @Get('categories')
  async getServiceCategories() {
    return this.servicesService.getServiceCategories();
  }

  @Get('search')
  async searchServices(@Query('q') query: string) {
    if (!query || query.trim().length < 3) {
      return {
        success: true,
        data: [],
      };
    }

    try {
      const results = await this.servicesService.searchServices(query);
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
  async getServiceById(@Param('id') id: string) {
    return this.servicesService.findById(id);
  }

  @Post()
  async createService(
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
    return this.servicesService.create(createServiceDto);
  }

  @Put(':id')
  async updateService(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, updateServiceDto);
  }

  @Delete(':id')
  async deleteService(@Param('id') id: string) {
    return this.servicesService.delete(id);
  }

  // --- Service groups ---
  @Get('groups/by-salon')
  async getGroupsBySalon(@Query('salonId') salonId: string) {
    if (!salonId) {
      throw new Error('Salon ID is required');
    }
    return this.servicesService.findGroupsBySalon(salonId);
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
    return this.servicesService.createGroup(body);
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
    return this.servicesService.updateGroup(id, body);
  }

  @Delete('groups/:id')
  async deleteGroup(@Param('id') id: string) {
    return this.servicesService.deleteGroup(id);
  }
}
