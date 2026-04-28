import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Headers,
  Query,
  Param,
  Res,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterClientDto } from './dto/register-client.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { GetUserRoleDto } from './dto/get-user-role.dto';

@Throttle({ short: { limit: 25, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('send-business-magic-link')
  async sendBusinessMagicLink(
    @Body()
    data: {
      email: string;
      name: string;
      password: string;
      locale?: string;
    },
  ) {
    try {
      this.logger.log(
        `Send business magic link (hasPassword=${!!data.password})`,
      );
      const result = await this.authService.sendBusinessMagicLink(
        data.email,
        data.name,
        data.password,
        data.locale,
      );
      this.logger.log('Business magic link sent');
      return result;
    } catch (error) {
      this.logger.warn(
        `Send business magic link failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to send magic link',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('register')
  async registerUser(
    @Body()
    data: {
      userId: string | null;
      email: string;
      password?: string;
      name?: string;
      role?: string;
      magicLinkToken?: string;
    },
    @Headers('authorization') authHeader?: string,
  ) {
    try {
      const result = await this.authService.registerOwner(data, {
        authHeader,
      });
      return result;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      const msg =
        error instanceof Error ? error.message : 'Registration failed';
      this.logger.warn(`Registration error: ${msg}`);
      throw new HttpException(msg, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('register-client')
  async registerClient(@Body() data: RegisterClientDto) {
    try {
      this.logger.log('Client registration request');
      const result = await this.authService.registerClient(data);
      this.logger.log(
        `Client registration ok userId=${result.user.id.slice(0, 8)}…`,
      );
      return result;
    } catch (error) {
      this.logger.warn(
        `Client registration failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error.message || 'Registration failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('register-client/request-code')
  async requestClientRegistrationCode(@Body() data: RegisterClientDto) {
    try {
      this.logger.log('Client registration OTP request');
      return await this.authService.requestClientRegistrationCode(data);
    } catch (error) {
      this.logger.warn(
        `Client registration OTP request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error.message || 'Failed to send verification code',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('register-client/verify-code')
  async verifyClientRegistrationCode(
    @Body() data: { email: string; code: string },
  ) {
    try {
      this.logger.log('Client registration OTP verify');
      return await this.authService.verifyClientRegistrationCode(data);
    } catch (error) {
      this.logger.warn(
        `Client registration OTP verify failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error.message || 'Failed to verify code',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('login-client')
  async loginClient(@Body() data: { email: string; password: string }) {
    try {
      const result = await this.authService.loginClient(data);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Login failed',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Get('user')
  async getUser(@Headers('authorization') authHeader: string) {
    try {
      this.logger.log(
        `Get user authHeader=${authHeader ? 'present' : 'missing'}`,
      );
      const result = await this.authService.getCurrentUser(authHeader);
      this.logger.log(`Get user ok id=${result.user.id.slice(0, 8)}…`);
      return result;
    } catch (error) {
      this.logger.warn(
        `Get user failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error.message || 'Failed to get user data',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Get('initialize')
  async initialize(
    @Headers('authorization') authHeader: string,
    @Query('includeSalon') includeSalon?: string,
  ) {
    try {
      this.logger.log('Initialize request');
      const result = await this.authService.initializeUser(authHeader, {
        includeSalon: includeSalon === 'true',
      });
      this.logger.log(`Initialize ok id=${result.user.id.slice(0, 8)}…`);
      return result;
    } catch (error) {
      this.logger.warn(
        `Initialize failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error.message || 'Failed to initialize user',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Put('profile')
  async updateProfile(
    @Body() data: UpdateProfileDto,
    @Headers('authorization') authHeader: string,
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);

      const updatedUser = await this.authService.updateUserProfile(
        currentUser.user.id,
        data,
      );

      return {
        success: true,
        user: updatedUser,
      };
    } catch (error) {
      this.logger.warn(
        `Update profile failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error.message || 'Failed to update profile',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('user-role')
  async getUserRole(
    @Body() data: GetUserRoleDto,
    @Headers('authorization') authHeader: string,
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);
      const requestedUserId = data.userId?.trim() || currentUser.user.id;
      const isAdmin = currentUser.user.role === 'ADMIN';
      if (!isAdmin && requestedUserId !== currentUser.user.id) {
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }
      const role = await this.authService.getUserRole(requestedUserId);
      return { role };
    } catch (error) {
      this.logger.warn(
        `Get user role failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error.message || 'Failed to get user role',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch('user-role')
  async updateOwnRole(
    @Body() data: { role: 'CLIENT' | 'OWNER' | 'ADMIN' },
    @Headers('authorization') authHeader: string,
  ) {
    try {
      if (data.role !== 'CLIENT') {
        throw new HttpException(
          'Only CLIENT role is allowed for self-update',
          HttpStatus.FORBIDDEN,
        );
      }
      // Получаем текущего пользователя
      const currentUser = await this.authService.getCurrentUser(authHeader);

      // Пользователь может обновить только свою роль
      const updatedUser = await this.authService.updateUserRole(
        currentUser.user.id,
        data.role,
      );
      return {
        success: true,
        user: updatedUser,
      };
    } catch (error) {
      this.logger.warn(
        `Update own role failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error.message || 'Failed to update role',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('user-role')
  async updateUserRole(
    @Body() data: { userId: string; role: 'CLIENT' | 'OWNER' | 'ADMIN' },
    @Headers('authorization') authHeader: string,
  ) {
    try {
      // Проверяем, что запрос делает админ
      const currentUser = await this.authService.getCurrentUser(authHeader);
      if (currentUser.user.role !== 'ADMIN') {
        throw new Error('Only admins can update user roles');
      }

      const updatedUser = await this.authService.updateUserRole(
        data.userId,
        data.role,
        { allowPrivilegeEscalation: true },
      );
      return {
        success: true,
        user: updatedUser,
      };
    } catch (error) {
      this.logger.warn(
        `Update user role failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error.message || 'Failed to update user role',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('sync-user')
  async syncUser(
    @Body() data: { userId: string },
    @Headers('authorization') authHeader: string,
  ) {
    try {
      // Проверяем, что запрос делает админ
      const currentUser = await this.authService.getCurrentUser(authHeader);
      if (currentUser.user.role !== 'ADMIN') {
        throw new Error('Only admins can sync users');
      }

      const user = await this.authService.syncUserFromSupabase(data.userId);
      return {
        success: true,
        user,
      };
    } catch (error) {
      this.logger.warn(
        `Sync user failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error.message || 'Failed to sync user',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('account')
  async deleteAccount(@Headers('authorization') authHeader: string) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);

      const result = await this.authService.deleteUserAccount(
        currentUser.user.id,
      );

      return {
        success: true,
        message: 'Account deleted successfully',
        data: result,
      };
    } catch (error) {
      this.logger.warn(
        `Delete account failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error.message || 'Failed to delete account',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('favorites')
  async getFavoriteSalons(@Headers('authorization') authHeader: string) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);
      const favorites = await this.authService.getFavoriteSalons(
        currentUser.user.id,
      );

      return {
        success: true,
        favorites,
      };
    } catch (error) {
      this.logger.warn(
        `Get favorites failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error.message || 'Failed to get favorite salons',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('favorites/:salonId')
  async addFavoriteSalon(
    @Headers('authorization') authHeader: string,
    @Body() body: { salonId: string },
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);
      const updatedUser = await this.authService.addFavoriteSalon(
        currentUser.user.id,
        body.salonId,
      );

      return {
        success: true,
        message: 'Salon added to favorites',
        favoriteSalons: updatedUser.favoriteStudios,
      };
    } catch (error) {
      this.logger.warn(
        `Add favorite failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error.message || 'Failed to add salon to favorites',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('favorites/:salonId')
  async removeFavoriteSalon(
    @Headers('authorization') authHeader: string,
    @Body() body: { salonId: string },
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);
      const updatedUser = await this.authService.removeFavoriteSalon(
        currentUser.user.id,
        body.salonId,
      );

      return {
        success: true,
        message: 'Salon removed from favorites',
        favoriteSalons: updatedUser.favoriteStudios,
      };
    } catch (error) {
      this.logger.warn(
        `Remove favorite failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error.message || 'Failed to remove salon from favorites',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('verify-business-magic-link')
  async verifyBusinessMagicLink(
    @Query('token') token: string,
    @Query('locale') locale?: string,
  ) {
    try {
      if (!token) {
        throw new HttpException('Token is required', HttpStatus.BAD_REQUEST);
      }
      const result = await this.authService.verifyBusinessMagicLink(
        token,
        locale,
      );
      return result;
    } catch (error) {
      this.logger.warn(
        `Verify business magic link failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error.message || 'Failed to verify magic link',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('business-magic-link/:token')
  async redirectBusinessMagicLink(
    @Res() res: Response,
    @Param('token') token: string,
    @Query('locale') locale?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    try {
      if (!token) {
        const frontendUrl =
          process.env.FRONTEND_URL ||
          (process.env.NODE_ENV === 'production'
            ? 'https://henzo.app'
            : 'http://localhost:3000');
        return res.redirect(
          `${frontendUrl}/en/business/register?error=invalid_link`,
        );
      }

      // Определяем locale: из query параметра, из Accept-Language заголовка, или дефолтный 'en'
      let detectedLocale = locale;
      if (!detectedLocale && acceptLanguage) {
        const lang = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase();
        if (lang === 'ru' || lang === 'en' || lang === 'vi') {
          detectedLocale = lang;
        }
      }
      if (
        !detectedLocale ||
        (detectedLocale !== 'ru' &&
          detectedLocale !== 'en' &&
          detectedLocale !== 'vi')
      ) {
        detectedLocale = 'en';
      }

      this.logger.log(`Business magic link redirect locale=${detectedLocale}`);

      const result = await this.authService.verifyBusinessMagicLink(
        token,
        detectedLocale,
      );

      if (result.success && result.magicLinkUrl) {
        this.logger.log('Redirecting to Supabase magic link');
        return res.redirect(result.magicLinkUrl);
      }

      // Если нет magicLinkUrl, редиректим на страницу регистрации с ошибкой
      const frontendUrl =
        process.env.FRONTEND_URL ||
        (process.env.NODE_ENV === 'production'
          ? 'https://henzo.app'
          : 'http://localhost:3000');
      return res.redirect(
        `${frontendUrl}/${detectedLocale}/business/register?error=verification_failed`,
      );
    } catch (error) {
      this.logger.warn(
        `Redirect business magic link failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      const frontendUrl =
        process.env.FRONTEND_URL ||
        (process.env.NODE_ENV === 'production'
          ? 'https://henzo.app'
          : 'http://localhost:3000');

      // Определяем locale для ошибки
      let detectedLocale = locale;
      if (!detectedLocale && acceptLanguage) {
        const lang = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase();
        if (lang === 'ru' || lang === 'en' || lang === 'vi') {
          detectedLocale = lang;
        }
      }
      if (
        !detectedLocale ||
        (detectedLocale !== 'ru' &&
          detectedLocale !== 'en' &&
          detectedLocale !== 'vi')
      ) {
        detectedLocale = 'en';
      }

      let errorParam = 'verification_failed';
      if (error.message?.includes('expired')) {
        errorParam = 'link_expired';
      } else if (error.message?.includes('Invalid')) {
        errorParam = 'invalid_link';
      }

      return res.redirect(
        `${frontendUrl}/${detectedLocale}/business/register?error=${errorParam}`,
      );
    }
  }
}
