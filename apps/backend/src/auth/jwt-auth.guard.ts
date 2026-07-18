import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      query?: Record<string, string | string[] | undefined>;
      user?: unknown;
    }>();
    const authHeader = request.headers['authorization'];
    if (!authHeader?.trim()) {
      throw new UnauthorizedException('Authorization required');
    }

    // Forward syncIfMissing so protected routes that rely on the guard's
    // getCurrentUser (not a second controller call) can still auto-provision
    // after OAuth. GET /auth/user is @Public and handles this itself.
    const syncParam = request.query?.syncIfMissing;
    const syncRaw = Array.isArray(syncParam) ? syncParam[0] : syncParam;
    const syncIfMissing = syncRaw === 'true' || syncRaw === '1';

    try {
      request.user = await this.authService.getCurrentUser(authHeader, {
        syncIfMissing,
      });
      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'ACCOUNT_NOT_FOUND' &&
        !syncIfMissing
      ) {
        throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
