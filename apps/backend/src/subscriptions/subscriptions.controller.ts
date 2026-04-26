import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { AuthService } from '../auth/auth.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly authService: AuthService,
  ) {}

  @Get('current')
  async getCurrentSubscription(@Headers('authorization') authHeader: string) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);

      if (currentUser.user.role !== 'OWNER') {
        throw new HttpException(
          'Only salon owners can access subscriptions',
          HttpStatus.FORBIDDEN,
        );
      }

      const subscription =
        await this.subscriptionsService.getCurrentSubscription(
          currentUser.user.id,
        );

      const configurationExpansionAllowed =
        this.subscriptionsService.isSalonConfigurationExpansionAllowed(
          subscription,
        );

      return {
        ...subscription,
        configurationExpansionAllowed,
      };
    } catch (error: any) {
      // Owner without studio is a valid onboarding state, not an API failure.
      if (error?.status === HttpStatus.NOT_FOUND) {
        return {
          success: true,
          data: null,
          needsSetup: true,
          configurationExpansionAllowed: false,
        };
      }
      console.error('❌ Get current subscription failed:', error.message);
      throw new HttpException(
        error.message || 'Failed to get subscription',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('switch')
  async switchSubscription(
    @Headers('authorization') authHeader: string,
    @Body('planType') planType: 'FREEMIUM' | 'PRO',
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);

      if (currentUser.user.role !== 'OWNER') {
        throw new HttpException(
          'Only salon owners can switch subscriptions',
          HttpStatus.FORBIDDEN,
        );
      }

      if (!planType || !['FREEMIUM', 'PRO'].includes(planType)) {
        throw new HttpException(
          'Invalid plan type. Must be FREEMIUM or PRO',
          HttpStatus.BAD_REQUEST,
        );
      }

      const subscription = await this.subscriptionsService.switchSubscription(
        currentUser.user.id,
        planType,
      );

      return subscription;
    } catch (error) {
      console.error('❌ Switch subscription failed:', error.message);
      throw new HttpException(
        error.message || 'Failed to switch subscription',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('cancel')
  async cancelSubscription(@Headers('authorization') authHeader: string) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);
      if (currentUser.user.role !== 'OWNER') {
        throw new HttpException(
          'Only salon owners can cancel subscription',
          HttpStatus.FORBIDDEN,
        );
      }
      await this.subscriptionsService.cancelSubscription(currentUser.user.id);
      return { ok: true };
    } catch (error: any) {
      console.error('❌ Cancel subscription failed:', error?.message);
      throw new HttpException(
        error?.message ?? 'Failed to cancel subscription',
        error?.status ?? HttpStatus.BAD_REQUEST,
      );
    }
  }
}
