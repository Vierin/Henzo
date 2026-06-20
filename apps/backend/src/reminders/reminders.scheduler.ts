import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RemindersService } from './reminders.service';
import { FitnessSessionsService } from '../fitness/fitness-sessions.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(
    private readonly remindersService: RemindersService,
    private readonly fitnessSessionsService: FitnessSessionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Every 15 min: complete past sessions, send due push reminders; email only when enabled. */
  @Cron('0,15,30,45 * * * *')
  async handleRemindersCheck() {
    try {
      const { updated } =
        await this.fitnessSessionsService.completePastTrainingSessions();

      const pushResult =
        await this.notificationsService.sendPendingPushReminders();

      let emailSent = 0;
      let emailErrors = 0;
      if (process.env.EMAIL_REMINDERS_ENABLED === 'true') {
        const emailResult = await this.remindersService.sendBookingReminders();
        emailSent = emailResult.sent;
        emailErrors = emailResult.errors;
      }

      const parts = [
        `${updated} sessions completed`,
        `push ${pushResult.sent} sent`,
      ];
      if (process.env.EMAIL_REMINDERS_ENABLED === 'true') {
        parts.push(`email ${emailSent} sent`);
        if (emailErrors > 0) {
          parts.push(`${emailErrors} email errors`);
        }
      }

      this.logger.log(`Cron tick: ${parts.join(', ')}`);
    } catch (error) {
      this.logger.error('Reminders cron failed', error);
    }
  }
}
