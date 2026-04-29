import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { StudiosModule } from './studios/studios.module';
import { TrainersModule } from './trainers/trainers.module';
import { TrainingsModule } from './trainings/trainings.module';
import { AuthModule } from './auth/auth.module';
import { GeocodingModule } from './geocoding/geocoding.module';
import { EmailModule } from './email/email.module';
import { RemindersModule } from './reminders/reminders.module';
import { ContactModule } from './contact/contact.module';
import { SearchModule } from './search/search.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MapboxModule } from './mapbox/mapbox.module';
import { AppThrottlerModule } from './throttler/throttler.module';
import { QueueModule } from './queue/queue.module';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
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
    AppThrottlerModule,
    QueueModule,
    PrismaModule,
    StudiosModule,
    TrainersModule,
    TrainingsModule,
    AuthModule,
    GeocodingModule,
    EmailModule,
    RemindersModule,
    ContactModule,
    SearchModule,
    NotificationsModule,
    MapboxModule,
    FitnessModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
