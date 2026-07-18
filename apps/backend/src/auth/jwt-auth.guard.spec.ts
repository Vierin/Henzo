import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './public.decorator';

describe('JwtAuthGuard', () => {
  const makeContext = (
    authHeader?: string,
    query?: Record<string, string | string[] | undefined>,
  ): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: authHeader },
          query: query ?? {},
        }),
      }),
    }) as ExecutionContext;

  it('allows @Public routes without Authorization header', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const authService = {} as AuthService;
    const guard = new JwtAuthGuard(reflector, authService);

    await expect(guard.canActivate(makeContext())).resolves.toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
  });

  it('rejects protected routes without Authorization header', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const authService = {} as AuthService;
    const guard = new JwtAuthGuard(reflector, authService);

    await expect(guard.canActivate(makeContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches user on valid token', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const authService = {
      getCurrentUser: jest.fn().mockResolvedValue({ user: { id: 'u1' } }),
    } as unknown as AuthService;
    const guard = new JwtAuthGuard(reflector, authService);
    const ctx = makeContext('Bearer token');

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(authService.getCurrentUser).toHaveBeenCalledWith('Bearer token', {
      syncIfMissing: false,
    });
  });

  it('forwards syncIfMissing=true from query to getCurrentUser', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const authService = {
      getCurrentUser: jest.fn().mockResolvedValue({ user: { id: 'u1' } }),
    } as unknown as AuthService;
    const guard = new JwtAuthGuard(reflector, authService);
    const ctx = makeContext('Bearer token', { syncIfMissing: 'true' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(authService.getCurrentUser).toHaveBeenCalledWith('Bearer token', {
      syncIfMissing: true,
    });
  });

  it('surfaces ACCOUNT_NOT_FOUND instead of generic invalid token', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const authService = {
      getCurrentUser: jest
        .fn()
        .mockRejectedValue(new Error('ACCOUNT_NOT_FOUND')),
    } as unknown as AuthService;
    const guard = new JwtAuthGuard(reflector, authService);

    await expect(
      guard.canActivate(makeContext('Bearer token')),
    ).rejects.toEqual(
      expect.objectContaining({
        message: 'ACCOUNT_NOT_FOUND',
      }),
    );
  });
});
