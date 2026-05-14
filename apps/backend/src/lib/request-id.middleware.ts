import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';

export type RequestWithId = Request & { requestId?: string };

/// Читает X-Request-ID из входящего запроса (мобильный клиент шлёт его), если нет — генерит.
/// Пишет в req.requestId и в response header для корреляции client ↔ backend логов.
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    const incoming = req.header('x-request-id')?.trim();
    const requestId =
      incoming && incoming.length > 0 && incoming.length <= 64
        ? incoming
        : nanoid(12);
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  }
}
