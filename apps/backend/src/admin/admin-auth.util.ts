import { ForbiddenException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

export async function assertAdmin(
  authService: AuthService,
  authHeader: string | undefined,
): Promise<{ userId: string; email: string }> {
  const current = await authService.getCurrentUser(authHeader ?? '');
  if (current.user.role !== 'ADMIN') {
    throw new ForbiddenException('Admin access required');
  }
  const allowed = process.env.ADMIN_ALLOWED_EMAILS?.trim();
  if (!allowed && process.env.HENZO_ENV === 'production') {
    throw new ForbiddenException('Admin email allowlist is not configured');
  }
  if (allowed) {
    const list = allowed
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (
      list.length > 0 &&
      !list.includes((current.user.email ?? '').toLowerCase())
    ) {
      throw new ForbiddenException('Email not allowed for admin access');
    }
  }
  return { userId: current.user.id, email: current.user.email };
}
