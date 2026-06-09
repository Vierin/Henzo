import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RemindersService } from './reminders.service';
import { FitnessSessionsService } from '../fitness/fitness-sessions.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RemindersScheduler {
  constructor(
    private readonly remindersService: RemindersService,
    private readonly fitnessSessionsService: FitnessSessionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0,15,30,45 * * * *')
  async handleRemindersCheck() {
    console.log('🕐 Running reminders check (every 15 minutes)...');

    try {
      await this.fitnessSessionsService.completePastTrainingSessions();

      const emailRemindersEnabled =
        process.env.EMAIL_REMINDERS_ENABLED === 'true';

      const [emailResult, pushResult] = await Promise.all([
        emailRemindersEnabled
          ? this.remindersService.sendBookingReminders()
          : Promise.resolve({ sent: 0, errors: 0 }),
        this.notificationsService.sendPendingPushReminders(),
      ]);

      console.log(
        `✅ Reminders: email ${emailResult.sent} sent (enabled=${emailRemindersEnabled}), push ${pushResult.sent} sent`,
      );
    } catch (error) {
      console.error('❌ Error in reminders check:', error);
    }
  }
}
