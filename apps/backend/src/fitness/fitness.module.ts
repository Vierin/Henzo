import { Module } from '@nestjs/common';
import { FitnessController } from './fitness.controller';
import { StudiosModule } from '../salons/studios.module';
import { TrainingsModule } from '../trainings/trainings.module';
import { TrainersModule } from '../trainers/trainers.module';
import { BookingsModule } from '../bookings/bookings.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    StudiosModule,
    TrainingsModule,
    TrainersModule,
    BookingsModule,
    AuthModule,
    SubscriptionsModule,
  ],
  controllers: [FitnessController],
})
export class FitnessModule {}
