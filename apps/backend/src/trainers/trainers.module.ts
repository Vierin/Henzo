import { Module } from '@nestjs/common';
import { TrainersController } from './trainers.controller';
import { TrainersService } from './trainers.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, AuthModule, SubscriptionsModule, EmailModule],
  controllers: [TrainersController],
  providers: [TrainersService],
  exports: [TrainersService],
})
export class TrainersModule {}
