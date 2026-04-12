import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { BrevoEmailDeliveryService } from './brevo-email-delivery.service';
import { ClientBookingEmailService } from './client-booking-email.service';
import { SalonEmailService } from './salon-email.service';
import { TransactionalEmailService } from './transactional-email.service';

@Module({
  imports: [ConfigModule],
  providers: [
    BrevoEmailDeliveryService,
    ClientBookingEmailService,
    SalonEmailService,
    TransactionalEmailService,
    EmailService,
  ],
  exports: [EmailService],
})
export class EmailModule {}
