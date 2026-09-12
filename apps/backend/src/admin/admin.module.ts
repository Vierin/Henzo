import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StudiosModule } from '../studios/studios.module';
import { TrainingsModule } from '../trainings/trainings.module';
import { TrainersModule } from '../trainers/trainers.module';
import { FitnessModule } from '../fitness/fitness.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AdminController } from './admin.controller';
import { AdminEventLogModule } from './admin-event-log.module';
import { AdminOwnerActivityService } from './admin-owner-activity.service';
import { AdminService } from './admin.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    StudiosModule,
    TrainingsModule,
    TrainersModule,
    FitnessModule,
    NotificationsModule,
    EmailModule,
    AdminEventLogModule,
    SubscriptionsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminOwnerActivityService],
  exports: [AdminEventLogModule],
})
export class AdminModule {}
