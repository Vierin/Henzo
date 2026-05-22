import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';

function parsePage(v?: string): number {
  const n = Number(v ?? '1');
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function parseLimit(v?: string): number {
  const n = Number(v ?? '20');
  if (!Number.isFinite(n) || n < 1) return 20;
  return Math.min(100, Math.floor(n));
}

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private handleError(error: unknown): never {
    if (error instanceof ForbiddenException) {
      throw new HttpException(error.message, HttpStatus.FORBIDDEN);
    }
    const msg = error instanceof Error ? error.message : 'Request failed';
    throw new HttpException(msg, HttpStatus.BAD_REQUEST);
  }

  @Get('overview')
  async overview(@Headers('authorization') authHeader: string) {
    try {
      return { data: await this.adminService.getOverview(authHeader) };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('studios')
  async studios(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    try {
      return {
        data: await this.adminService.listStudios(
          authHeader,
          parsePage(page),
          parseLimit(limit),
          status,
          search,
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('studios/:id')
  async studio(
    @Headers('authorization') authHeader: string,
    @Param('id') id: string,
  ) {
    try {
      return { data: await this.adminService.getStudio(authHeader, id) };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('subscriptions')
  async subscriptions(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    try {
      return {
        data: await this.adminService.listSubscriptions(
          authHeader,
          parsePage(page),
          parseLimit(limit),
          status,
          type,
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('notifications')
  async notifications(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    try {
      return {
        data: await this.adminService.listNotifications(
          authHeader,
          parsePage(page),
          parseLimit(limit),
          type,
          from,
          to,
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('feedback')
  async feedback(
    @Headers('authorization') authHeader: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      return {
        data: await this.adminService.listFeedback(
          authHeader,
          parsePage(page),
          parseLimit(limit),
        ),
      };
    } catch (e) {
      this.handleError(e);
    }
  }

  @Get('settings')
  async settings(@Headers('authorization') authHeader: string) {
    try {
      return { data: await this.adminService.getSettings(authHeader) };
    } catch (e) {
      this.handleError(e);
    }
  }
}
