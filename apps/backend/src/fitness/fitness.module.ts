import { Module } from '@nestjs/common';
import { FitnessController } from './fitness.controller';
import { StudiosModule } from '../studios/studios.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FitnessSessionsService } from './fitness-sessions.service';
import { StudioAnalyticsService } from './studio-analytics.service';

@Module({
  imports: [StudiosModule, AuthModule, PrismaModule],
  controllers: [FitnessController],
  providers: [FitnessSessionsService, StudioAnalyticsService],
})
export class FitnessModule {}
