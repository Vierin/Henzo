import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RemindersService } from './reminders.service';
import { FitnessSessionsService } from '../fitness/fitness-sessions.service';

@Injectable()
export class RemindersScheduler {
  constructor(
    private readonly remindersService: RemindersService,
    private readonly fitnessSessionsService: FitnessSessionsService,
  ) {}

  // Run every 15 minutes to check for bookings that need reminders
  // This ensures we catch all bookings exactly 24 hours before their appointment time
  // The window in sendBookingReminders is ±15 minutes, so running every 15 min is optimal
  @Cron('0,15,30,45 * * * *')
  async handleRemindersCheck() {
    console.log('🕐 Running booking reminders check (every 15 minutes)...');

    try {
      await this.fitnessSessionsService.completePastTrainingSessions();
      const result = await this.remindersService.sendBookingReminders();
      console.log(
        `✅ Reminders check completed: ${result.sent} sent, ${result.errors} errors`,
      );
    } catch (error) {
      console.error('❌ Error in reminders check:', error);
    }
  }
}
