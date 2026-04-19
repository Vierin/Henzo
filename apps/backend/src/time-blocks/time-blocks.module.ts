import { Module } from '@nestjs/common';
import { TimeBlocksController } from './time-blocks.controller';
import { TimeBlocksService } from './time-blocks.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [PrismaModule, AuthModule, SubscriptionsModule],
  controllers: [TimeBlocksController],
  providers: [TimeBlocksService],
  exports: [TimeBlocksService],
})
export class TimeBlocksModule {}
