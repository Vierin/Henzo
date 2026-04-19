import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PromotionCouponService } from '../subscriptions/promotion-coupon.service';

@Controller('admin/promotion-coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PromotionCouponsController {
  constructor(
    private readonly promotionCouponService: PromotionCouponService,
  ) {}

  @Get()
  async list() {
    try {
      return await this.promotionCouponService.listForAdmin();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Failed to list coupons';
      throw new HttpException(msg, HttpStatus.BAD_REQUEST);
    }
  }

  @Post()
  async create(
    @Body()
    body: {
      label: string;
      stripeCouponId: string;
      useForAutoAnnual?: boolean;
    },
  ) {
    if (!body?.label || !body?.stripeCouponId) {
      throw new HttpException(
        'label and stripeCouponId are required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.promotionCouponService.create({
      label: body.label,
      stripeCouponId: body.stripeCouponId,
      useForAutoAnnual: body.useForAutoAnnual,
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      label?: string;
      isActive?: boolean;
      useForAutoAnnual?: boolean;
    },
  ) {
    return this.promotionCouponService.update(id, body ?? {});
  }

  @Post(':id/refresh')
  async refresh(@Param('id') id: string) {
    return this.promotionCouponService.refreshFromStripe(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.promotionCouponService.delete(id);
  }
}
