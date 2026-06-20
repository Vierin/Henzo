import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { BrevoEmailDeliveryService } from './brevo-email-delivery.service';
import { ClientBookingEmailService } from './client-booking-email.service';
import { TransactionalEmailService } from './transactional-email.service';
import { EmailIconsController } from './email-icons.controller';
import { EmailIconConfigService } from './email-icon-config.service';

@Module({
  imports: [ConfigModule],
  controllers: [EmailIconsController],
  providers: [
    EmailIconConfigService,
    BrevoEmailDeliveryService,
    ClientBookingEmailService,
    TransactionalEmailService,
    EmailService,
  ],
  exports: [EmailService],
})
export class EmailModule {}
