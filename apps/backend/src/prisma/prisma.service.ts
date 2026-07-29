import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private static parsePositiveInt(
    rawValue: string | undefined,
    fallback: number,
  ): number {
    const parsed = Number.parseInt(rawValue ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private static buildConnectionUrl(
    databaseUrl: string | undefined,
  ): string | undefined {
    if (!databaseUrl || databaseUrl.trim().length === 0) {
      return databaseUrl;
    }

    try {
      const url = new URL(databaseUrl);
      const isPooler =
        url.hostname.includes('pooler.supabase.com') || url.port === '6543';
      const defaultConnectionLimit = isPooler ? 5 : 10;

      const defaults: Record<string, string> = {
        connection_limit: PrismaService.parsePositiveInt(
          process.env.PRISMA_CONNECTION_LIMIT,
          defaultConnectionLimit,
        ).toString(),
        pool_timeout: PrismaService.parsePositiveInt(
          process.env.PRISMA_POOL_TIMEOUT_SEC,
          30,
        ).toString(),
        connect_timeout: PrismaService.parsePositiveInt(
          process.env.PRISMA_CONNECT_TIMEOUT_SEC,
          10,
        ).toString(),
        sslmode: 'require',
        pgbouncer: 'true',
      };

      for (const [key, value] of Object.entries(defaults)) {
        if (!url.searchParams.has(key)) {
          url.searchParams.set(key, value);
        }
      }
      return url.toString();
    } catch {
      if (databaseUrl.includes('connection_limit=')) {
        return databaseUrl;
      }
      const separator = databaseUrl.includes('?') ? '&' : '?';
      return `${databaseUrl}${separator}connection_limit=10&pool_timeout=30&connect_timeout=10&sslmode=require&pgbouncer=true`;
    }
  }

  constructor() {
    const connectionUrl = PrismaService.buildConnectionUrl(
      process.env.DATABASE_URL,
    );

    super({
      datasources: {
        db: {
          url: connectionUrl,
        },
      },
      log:
        process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  /** Map PascalCase Prisma delegates when client was generated with model names. */
  private wireDelegates(): void {
    const client = this as Record<string, unknown>;
    const pairs: [string, string][] = [
      ['studio', 'Studio'],
      ['trainer', 'Trainer'],
      ['training', 'Training'],
      ['trainerInvite', 'TrainerInvite'],
      ['studioClaimToken', 'StudioClaimToken'],
      ['sessionBooking', 'SessionBooking'],
      ['subscription', 'Subscription'],
      ['trainingSession', 'TrainingSession'],
    ];
    for (const [camel, pascal] of pairs) {
      if (client[camel] == null && client[pascal] != null) {
        client[camel] = client[pascal];
      }
    }
  }

  async onModuleInit() {
    const maxAttempts = PrismaService.parsePositiveInt(
      process.env.PRISMA_CONNECT_RETRIES,
      5,
    );
    const baseDelayMs = PrismaService.parsePositiveInt(
      process.env.PRISMA_CONNECT_RETRY_DELAY_MS,
      1200,
    );

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.$connect();
        this.wireDelegates();
        if (attempt > 1) {
          console.warn(`[Prisma] connected on retry ${attempt}/${maxAttempts}`);
        }
        return;
      } catch (error) {
        if (attempt >= maxAttempts) throw error;
        const waitMs = baseDelayMs * attempt;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `[Prisma] connect attempt ${attempt}/${maxAttempts} failed: ${errorMessage}. Retrying in ${waitMs}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
