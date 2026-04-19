import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { TranslationService } from './translation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [PrismaModule, AuthModule, SubscriptionsModule],
  controllers: [ServicesController],
  providers: [ServicesService, TranslationService],
  exports: [TranslationService],
})
export class ServicesModule {}
