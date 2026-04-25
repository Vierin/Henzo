import { Module } from '@nestjs/common';
import { FitnessController } from './fitness.controller';
import { SalonsModule } from '../salons/salons.module';
import { ServicesModule } from '../services/services.module';
import { StaffModule } from '../staff/staff.module';
import { BookingsModule } from '../bookings/bookings.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    SalonsModule,
    ServicesModule,
    StaffModule,
    BookingsModule,
    AuthModule,
    SubscriptionsModule,
  ],
  controllers: [FitnessController],
})
export class FitnessModule {}
