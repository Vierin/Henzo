import { Prisma } from '@prisma/client';

const prismaConnectionCodes = new Set(['P1001', 'P1002', 'P1017']);

const connectionMessagePattern =
  /can't reach database server|can't reach database|connection timed out|connection refused|server has closed the connection/i;

/** Transient Prisma / Postgres connectivity (pooler, network, cold start). */
export function isDatabaseUnavailableError(exception: unknown): boolean {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return prismaConnectionCodes.has(exception.code);
  }

  if (exception instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  const message =
    exception instanceof Error ? exception.message : String(exception);
  return connectionMessagePattern.test(message);
}

export const databaseUnavailableMessage =
  'Database temporarily unavailable. Please try again.';
