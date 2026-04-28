import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // Compatibility aliases after domain rename in Prisma schema.
  // This lets legacy modules keep working while we migrate codepaths.
  get salon(): any {
    return (this as any).studio ?? (this as any).Studio;
  }
  get service(): any {
    return (this as any).training ?? (this as any).Training;
  }
  get staff(): any {
    return (this as any).trainer ?? (this as any).Trainer;
  }
  get booking(): any {
    return (this as any).sessionBooking ?? (this as any).SessionBooking;
  }
  constructor() {
    // Настраиваем connection pool для работы с Supabase pooler
    const databaseUrl = process.env.DATABASE_URL;

    // Добавляем параметры пула соединений, если их нет в URL
    // Увеличено для масштабирования на тысячи пользователей
    let connectionUrl = databaseUrl;
    if (databaseUrl && !databaseUrl.includes('connection_limit')) {
      const separator = databaseUrl.includes('?') ? '&' : '?';
      connectionUrl = `${databaseUrl}${separator}connection_limit=100&pool_timeout=30&connect_timeout=10`;
    }

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

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
