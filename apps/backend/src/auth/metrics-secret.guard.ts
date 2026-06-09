import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

/** Protects /metrics when METRICS_SECRET is set (recommended in production). */
@Injectable()
export class MetricsSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.METRICS_SECRET?.trim();
    if (!expected) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();
    const provided =
      request.headers['x-metrics-secret'] ??
      request.headers['authorization']?.replace(/^Bearer\s+/i, '');

    if (provided === expected) {
      return true;
    }

    throw new UnauthorizedException('Metrics access denied');
  }
}
