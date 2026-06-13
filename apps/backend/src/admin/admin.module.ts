import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StudiosModule } from '../studios/studios.module';
import { TrainingsModule } from '../trainings/trainings.module';
import { TrainersModule } from '../trainers/trainers.module';
import { FitnessModule } from '../fitness/fitness.module';
import { AdminCrashFreeCron } from './admin-crash-free.cron';
import { AdminController } from './admin.controller';
import { AdminEventLogService } from './admin-event-log.service';
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
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminEventLogService,
    AdminOwnerActivityService,
    AdminCrashFreeCron,
  ],
  exports: [AdminEventLogService],
})
export class AdminModule {}
