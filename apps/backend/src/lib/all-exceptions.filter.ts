import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import * as Sentry from '@sentry/nestjs';
import { Counter, register } from 'prom-client';
import type { RequestWithId } from './request-id.middleware';
import {
  databaseUnavailableMessage,
  isDatabaseUnavailableError,
} from './prisma-errors';

/// Singleton Prometheus counter (защита от двойной регистрации при HMR/тестах).
function getErrorsCounter(): Counter<string> {
  const existing = register.getSingleMetric('errors_total');
  if (existing) return existing as Counter<string>;
  return new Counter({
    name: 'errors_total',
    help: 'Total backend errors by route, status and exception name',
    labelNames: ['route', 'method', 'status', 'code'] as const,
  });
}

const errorsCounter = getErrorsCounter();

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    const isHttp = exception instanceof HttpException;
    const isDbUnavailable =
      !isHttp && isDatabaseUnavailableError(exception);

    const status = isHttp
      ? exception.getStatus()
      : isDbUnavailable
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = isHttp ? exception.getResponse() : null;
    const message = isDbUnavailable
      ? databaseUnavailableMessage
      : typeof errorResponse === 'string'
        ? errorResponse
        : ((errorResponse as Record<string, unknown>)?.message as string) ||
          (exception instanceof Error ? exception.message : 'Internal error');

    const code =
      exception instanceof Error ? exception.constructor.name : 'Unknown';
    const route = (request.route as { path?: string })?.path || request.path;
    const requestId = request.requestId;

    errorsCounter.inc({
      route,
      method: request.method,
      status: String(status),
      code,
    });

    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.originalUrl} → ${status} ${code}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      Sentry.withScope((scope) => {
        scope.setTag('route', route);
        scope.setTag('method', request.method);
        scope.setTag('status', String(status));
        if (requestId) scope.setTag('request_id', requestId);
        scope.setContext('request', {
          url: request.originalUrl,
          method: request.method,
          requestId,
        });
        Sentry.captureException(exception);
      });
    } else if (status >= 400) {
      // 4xx — клиентское поведение, не баг бэка. Логируем кратко без stack.
      this.logger.warn(
        `[${requestId}] ${request.method} ${request.originalUrl} → ${status} ${code}: ${message}`,
      );
    }

    if (response.headersSent) return;

    response.status(status).json({
      statusCode: status,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }
}
