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
import { StaffService } from './staff.service';
import { AuthService } from '../auth/auth.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Controller('staff')
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly authService: AuthService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get()
  async getStaffBySalon(@Query('salonId') salonId: string) {
    if (!salonId) {
      throw new Error('Salon ID is required');
    }
    return this.staffService.findBySalonId(salonId);
  }

  @Get(':id')
  async getStaffById(@Param('id') id: string) {
    return this.staffService.findById(id);
  }

  @Post()
  async createStaff(
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
    if (currentUser.user.role !== 'OWNER') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    await this.subscriptionsService.assertSalonOwnerMayExpandConfiguration(
      currentUser.user.id,
      data.salonId,
    );
    return this.staffService.create(data);
  }

  @Put(':id')
  async updateStaff(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      email?: string;
      phone?: string;
      accessLevel?: 'ADMIN' | 'EMPLOYEE';
      serviceIds?: string[];
    },
  ) {
    return this.staffService.update(id, data);
  }

  @Delete(':id')
  async deleteStaff(@Param('id') id: string) {
    return this.staffService.delete(id);
  }
}
