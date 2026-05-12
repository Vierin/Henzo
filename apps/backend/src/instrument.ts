// Sentry initialization. MUST be imported as the very first thing in main.ts
// for @sentry/nestjs auto-instrumentation to work.
//
// Minimal config: только error tracking. tracesSampleRate=0 / profilesSampleRate=0,
// без replay/releases. beforeSend дропает 4xx (поведение клиентов, не баги бэка).
// Без SENTRY_DSN — no-op, в dev можно не подключать.

import * as Sentry from '@sentry/nestjs';
import { resolveBackendEnvPath } from './config/resolve-backend-env-path';

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require('dotenv');
  const envPath = resolveBackendEnvPath(__dirname);
  if (envPath) {
    dotenv.config({ path: envPath });
  }
} catch {
  // env loaded from process; ignore
}

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0,
    profilesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event, hint) {
      const err = hint?.originalException as { status?: number } | undefined;
      if (err?.status && err.status >= 400 && err.status < 500) {
        return null;
      }
      return event;
    },
  });
}
