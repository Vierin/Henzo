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
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { RegisterClientDto } from './dto/register-client.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { GetUserRoleDto } from './dto/get-user-role.dto';
import { assertAdmin } from '../admin/admin-auth.util';
import { AdminEventLogService } from '../admin/admin-event-log.service';

@Throttle({ short: { limit: 25, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly adminEventLog: AdminEventLogService,
  ) {}

  @Public()
  @Post('register-owner/request-code')
  async requestOwnerRegistrationCode(
    @Body() data: { email: string; password: string; name?: string },
  ) {
    try {
      this.logger.log('Owner registration OTP request');
      return await this.authService.requestOwnerRegistrationCode(data);
    } catch (error) {
      this.logger.warn(
        `Owner registration OTP request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error instanceof Error
          ? error.message
          : 'Failed to send verification code',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Public()
  @Post('register-owner/verify-code')
  async verifyOwnerRegistrationCode(
    @Body() data: { email: string; code: string },
  ) {
    try {
      this.logger.log('Owner registration OTP verify');
      return await this.authService.verifyOwnerRegistrationCode(data);
    } catch (error) {
      this.logger.warn(
        `Owner registration OTP verify failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to verify code',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Public()
  @Post('register')
  async registerUser(
    @Body()
    data: {
      userId: string | null;
      email: string;
      password?: string;
      name?: string;
      role?: string;
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

  @Public()
  @Post('register-client')
  async registerClient(@Body() data: RegisterClientDto) {
    if (process.env.HENZO_ENV === 'production') {
      throw new HttpException(
        'Use POST /auth/register-client/request-code and verify-code',
        HttpStatus.GONE,
      );
    }
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

  @Public()
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

  @Public()
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

  @Public()
  @Post('sign-in-hint')
  async getSignInHint(@Body() data: { email: string }) {
    try {
      return await this.authService.getSignInHint(data.email);
    } catch (error) {
      this.logger.warn(
        `Sign-in hint failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { hint: null };
    }
  }

  @Public()
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

  /// Must stay `@Public`: global JwtAuthGuard calls getCurrentUser without
  /// `syncIfMissing`, which blocks Google/Apple client registration before
  /// this handler can auto-provision. Auth is enforced inside getCurrentUser.
  @Public()
  @Get('user')
  async getUser(
    @Headers('authorization') authHeader: string,
    @Query('syncIfMissing') syncIfMissing?: string,
  ) {
    try {
      this.logger.log(
        `Get user authHeader=${authHeader ? 'present' : 'missing'}`,
      );
      const result = await this.authService.getCurrentUser(authHeader, {
        syncIfMissing: syncIfMissing === 'true' || syncIfMissing === '1',
      });
      this.logger.log(`Get user ok id=${result.user.id.slice(0, 8)}…`);
      return result;
    } catch (error) {
      this.logger.warn(
        `Get user failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (error instanceof Error && error.message === 'ACCOUNT_NOT_FOUND') {
        throw new HttpException('ACCOUNT_NOT_FOUND', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        error.message || 'Failed to get user data',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Get('initialize')
  async initialize(
    @Headers('authorization') authHeader: string,
    @Query('includeStudio') includeStudio?: string,
  ) {
    try {
      this.logger.log('Initialize request');
      const result = await this.authService.initializeUser(authHeader, {
        includeStudio: includeStudio === 'true',
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
      const admin = await assertAdmin(this.authService, authHeader);
      const previous = await this.authService.getUserRole(data.userId);

      const updatedUser = await this.authService.updateUserRole(
        data.userId,
        data.role,
        { allowPrivilegeEscalation: true },
      );

      await this.adminEventLog.logAdminAction({
        action: 'user_role_changed',
        adminEmail: admin.email,
        metadata: {
          userId: data.userId,
          previousRole: previous,
          newRole: data.role,
        },
      });

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
      const admin = await assertAdmin(this.authService, authHeader);

      const user = await this.authService.syncUserFromSupabase(data.userId);

      await this.adminEventLog.logAdminAction({
        action: 'user_synced',
        adminEmail: admin.email,
        metadata: { userId: data.userId },
      });

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
  async getFavoriteStudios(@Headers('authorization') authHeader: string) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);
      const favorites = await this.authService.getFavoriteStudios(
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

  @Post('favorites/:studioId')
  async addFavoriteStudio(
    @Headers('authorization') authHeader: string,
    @Param('studioId') studioId: string,
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);
      const updatedUser = await this.authService.addFavoriteStudio(
        currentUser.user.id,
        studioId,
      );

      return {
        success: true,
        message: 'Studio added to favorites',
        favoriteStudios: updatedUser.favoriteStudios,
      };
    } catch (error) {
      this.logger.warn(
        `Add favorite failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error.message || 'Failed to add studio to favorites',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('favorites/:studioId')
  async removeFavoriteStudio(
    @Headers('authorization') authHeader: string,
    @Param('studioId') studioId: string,
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);
      const updatedUser = await this.authService.removeFavoriteStudio(
        currentUser.user.id,
        studioId,
      );

      return {
        success: true,
        message: 'Studio removed from favorites',
        favoriteStudios: updatedUser.favoriteStudios,
      };
    } catch (error) {
      this.logger.warn(
        `Remove favorite failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HttpException(
        error.message || 'Failed to remove studio from favorites',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
