import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminEventLogService } from './admin-event-log.service';

@Module({
  imports: [PrismaModule],
  providers: [AdminEventLogService],
  exports: [AdminEventLogService],
})
export class AdminEventLogModule {}
