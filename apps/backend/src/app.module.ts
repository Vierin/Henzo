import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { StudiosModule } from './salons/studios.module';
import { TrainersModule } from './trainers/trainers.module';
import { TrainingsModule } from './trainings/trainings.module';
import { AuthModule } from './auth/auth.module';
import { ReviewsModule } from './reviews/reviews.module';
import { GeocodingModule } from './geocoding/geocoding.module';
import { BookingsModule } from './bookings/bookings.module';
import { EmailModule } from './email/email.module';
import { AdminModule } from './admin/admin.module';
import { RemindersModule } from './reminders/reminders.module';
import { ContactModule } from './contact/contact.module';
import { SearchModule } from './search/search.module';
import { FeedbackModule } from './feedback/feedback.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MapboxModule } from './mapbox/mapbox.module';
import { CacheModule } from './cache/cache.module';
import { AppThrottlerModule } from './throttler/throttler.module';
import { QueueModule } from './queue/queue.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from './storage/storage.module';
import { validate } from './config/env.validation';
import { LoggerModule } from './common/logger/logger.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ClientsModule } from './clients/clients.module';
import { resolveBackendEnvPath } from './config/resolve-backend-env-path';
import { FitnessModule } from './fitness/fitness.module';

const backendEnvFile = resolveBackendEnvPath(__dirname);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      cache: true,
      ...(backendEnvFile ? { envFilePath: backendEnvFile } : {}),
    }),
    LoggerModule,
    CacheModule,
    AppThrottlerModule,
    QueueModule,
    MonitoringModule,
    PrismaModule,
    StudiosModule,
    TrainersModule,
    TrainingsModule,
    AuthModule,
    ReviewsModule,
    GeocodingModule,
    BookingsModule,
    EmailModule,
    AdminModule,
    RemindersModule,
    ContactModule,
    SearchModule,
    FeedbackModule,
    NotificationsModule,
    MapboxModule,
    StorageModule,
    SubscriptionsModule,
    ClientsModule,
    FitnessModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
