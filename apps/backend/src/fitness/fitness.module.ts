import { Module } from '@nestjs/common';
import { FitnessController } from './fitness.controller';
import { StudiosModule } from '../studios/studios.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FitnessSessionsService } from './fitness-sessions.service';
import { StudioAnalyticsService } from './studio-analytics.service';
import { StudioClientsService } from './studio-clients.service';

@Module({
  imports: [
    StudiosModule,
    AuthModule,
    PrismaModule,
    EmailModule,
    SubscriptionsModule,
    NotificationsModule,
  ],
  controllers: [FitnessController],
  providers: [
    FitnessSessionsService,
    StudioAnalyticsService,
    StudioClientsService,
  ],
  exports: [FitnessSessionsService, StudioClientsService],
})
export class FitnessModule {}
