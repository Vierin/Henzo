import { ForbiddenException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

export async function assertAdmin(
  authService: AuthService,
  authHeader: string | undefined,
): Promise<{ userId: string; email: string }> {
  const header = authHeader ?? '';
  const [current, authentication] = await Promise.all([
    authService.getCurrentUser(header),
    authService.getVerifiedAuthenticationContext(header),
  ]);
  if (current.user.role !== 'ADMIN') {
    throw new ForbiddenException('Admin access required');
  }
  if (current.user.id !== authentication.userId) {
    throw new ForbiddenException('Admin session identity mismatch');
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

  const hasGoogleIdentity =
    authentication.provider === 'google' ||
    authentication.providers.includes('google');
  const usedOAuth = authentication.methods.some(
    ({ method }) => method === 'oauth',
  );
  const usedPassword = authentication.methods.some(
    ({ method }) => method === 'password',
  );

  if (!hasGoogleIdentity || !usedOAuth || usedPassword) {
    throw new ForbiddenException('Google sign-in is required for admin access');
  }
  if (
    authentication.assuranceLevel !== 'aal2' ||
    !authentication.methods.some(({ method }) => method === 'totp')
  ) {
    throw new ForbiddenException(
      'Two-factor authentication is required for admin access',
    );
  }

  const maxAgeSeconds = Number.parseInt(
    process.env.ADMIN_SESSION_MAX_AGE_SECONDS ?? '43200',
    10,
  );
  const oauthTimestamp = Math.max(
    ...authentication.methods
      .filter(({ method }) => method === 'oauth')
      .map(({ timestamp }) => timestamp),
  );
  if (
    !Number.isFinite(maxAgeSeconds) ||
    maxAgeSeconds <= 0 ||
    !Number.isFinite(oauthTimestamp) ||
    Date.now() / 1000 - oauthTimestamp > maxAgeSeconds
  ) {
    throw new ForbiddenException('Admin session expired; sign in again');
  }

  return { userId: current.user.id, email: current.user.email };
}
