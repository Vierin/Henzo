import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RemindersService } from './reminders.service';
import { RemindersScheduler } from './reminders.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { FitnessModule } from '../fitness/fitness.module';
import { AdminModule } from '../admin/admin.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    FitnessModule,
    AdminModule,
    NotificationsModule,
    ScheduleModule.forRoot(),
  ],
  providers: [RemindersService, RemindersScheduler],
  exports: [RemindersService],
})
export class RemindersModule {}
