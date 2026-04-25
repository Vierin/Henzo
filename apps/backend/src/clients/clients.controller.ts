import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Headers,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { AuthService } from '../auth/auth.service';

@Controller('clients')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async getClients(
    @Headers('authorization') authHeader: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);

      if (currentUser.user.role !== 'OWNER') {
        throw new HttpException(
          'Access denied. Only salon owners can access this endpoint.',
          HttpStatus.FORBIDDEN,
        );
      }

      const pageNumber = page ? parseInt(page, 10) : 1;
      const limitNumber = limit ? parseInt(limit, 10) : 50;

      // Validate pagination params
      if (pageNumber < 1 || limitNumber < 1 || limitNumber > 100) {
        throw new HttpException(
          'Invalid pagination parameters',
          HttpStatus.BAD_REQUEST,
        );
      }

      return this.clientsService.getClients(currentUser.user.id, {
        search,
        page: pageNumber,
        limit: limitNumber,
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to fetch clients',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id')
  async getClientById(
    @Headers('authorization') authHeader: string,
    @Param('id') clientId: string,
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);

      if (currentUser.user.role !== 'OWNER') {
        throw new HttpException(
          'Access denied. Only salon owners can access this endpoint.',
          HttpStatus.FORBIDDEN,
        );
      }

      return this.clientsService.getClientById(currentUser.user.id, clientId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to fetch client',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id/bookings')
  async getClientBookings(
    @Headers('authorization') authHeader: string,
    @Param('id') clientId: string,
  ) {
    try {
      const currentUser = await this.authService.getCurrentUser(authHeader);

      if (currentUser.user.role !== 'OWNER') {
        throw new HttpException(
          'Access denied. Only salon owners can access this endpoint.',
          HttpStatus.FORBIDDEN,
        );
      }

      return this.clientsService.getClientBookings(
        currentUser.user.id,
        clientId,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to fetch client bookings',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

}
