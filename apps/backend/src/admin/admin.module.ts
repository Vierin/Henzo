import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminCrashFreeCron } from './admin-crash-free.cron';
import { AdminController } from './admin.controller';
import { AdminEventLogService } from './admin-event-log.service';
import { AdminService } from './admin.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService, AdminEventLogService, AdminCrashFreeCron],
  exports: [AdminEventLogService],
})
export class AdminModule {}
