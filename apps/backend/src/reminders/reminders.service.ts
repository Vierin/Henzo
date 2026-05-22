import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AdminEventLogService } from '../admin/admin-event-log.service';
import { InputJsonValue } from '@prisma/client/runtime/library';
import { formatInTimeZone } from 'date-fns-tz';

type BookingWithRelations = {
  id: string;
  startsAt: Date;
  status: string;
  reminderSent: boolean;
  remindersSentIntervals?: number[] | null;
  studioId: string;
  clientEmailLocale: string;
  User: {
    id: string;
    name: string | null;
    email: string;
  };
  Training: {
    id: string;
    name: string;
    nameEn?: string | null;
    nameVi?: string | null;
    nameRu?: string | null;
    duration: number;
    price: number;
  };
  Studio: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    reminderSettings?: any;
    timezone?: string; // IANA timezone identifier (e.g., "Asia/Ho_Chi_Minh")
  };
  Trainer: {
    id: string;
    name: string;
  } | null;
};

function getLocalizedTrainingName(
  training: BookingWithRelations['Training'],
  locale: 'en' | 'ru' | 'vi',
): string {
  if (locale === 'ru')
    return training.nameRu || training.nameEn || training.name;
  if (locale === 'vi')
    return training.nameVi || training.nameEn || training.name;
  return training.nameEn || training.name;
}

@Injectable()
export class RemindersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private analytics: AnalyticsService,
    private readonly adminEventLog: AdminEventLogService,
  ) {}

  async sendBookingReminders() {
    try {
      console.log('🔔 Starting booking reminders check for all intervals...');

      // Get current date and time in UTC
      const now = new Date();
      console.log(`⏰ Current time (UTC): ${now.toISOString()}`);
      console.log(`⏰ Current time (local): ${now.toString()}`);

      // Only one reminder: 24 hours before booking.
      const possibleIntervals = [24];
      const windowMinutes = 15; // ±15 minutes window

      let totalSent = 0;
      let totalErrors = 0;

      // Process each interval
      for (const intervalHours of possibleIntervals) {
        const intervalMs = intervalHours * 60 * 60 * 1000;
        const windowMs = windowMinutes * 60 * 1000;

        // Calculate a wider window to account for timezone differences
        // We'll filter more precisely later for each booking's timezone
        // Use a wider window: ±2 hours to account for timezone offsets (max ±12 hours)
        const wideWindowMs = 2 * 60 * 60 * 1000; // ±2 hours
        const reminderWindowStart = new Date(
          now.getTime() + intervalMs - wideWindowMs,
        );
        const reminderWindowEnd = new Date(
          now.getTime() + intervalMs + wideWindowMs,
        );

        console.log(
          `Checking ${intervalHours}h interval: bookings between ${reminderWindowStart.toISOString()} and ${reminderWindowEnd.toISOString()}`,
        );

        // Find CONFIRMED bookings that might be scheduled at this interval
        // We use a wider window and filter precisely later
        let bookings: BookingWithRelations[];
        try {
          bookings = (await this.prisma.sessionBooking.findMany({
            where: {
              startsAt: {
                gte: reminderWindowStart,
                lte: reminderWindowEnd,
              },
              status: {
                in: ['CONFIRMED'], // Only send reminders for confirmed bookings
              },
            },
            select: {
              id: true,
              startsAt: true,
              status: true,
              reminderSent: true,
              remindersSentIntervals: true,
              studioId: true,
              clientEmailLocale: true,
              User: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              Training: {
                select: {
                  id: true,
                  name: true,
                  nameEn: true,
                  nameVi: true,
                  nameRu: true,
                  duration: true,
                  price: true,
                },
              },
              Studio: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  phone: true,
                  reminderSettings: true,
                  timezone: true,
                },
              },
              Trainer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          })) as BookingWithRelations[];
        } catch (error: any) {
          // Обработка ошибок пула соединений
          if (error.code === 'P2024') {
            console.error(
              '❌ Connection pool timeout. Retrying in 5 seconds...',
            );
            throw new Error(
              'Connection pool exhausted. Please try again later.',
            );
          }
          throw error;
        }

        console.log(
          `📊 Found ${bookings.length} bookings for ${intervalHours}h interval (window: ${reminderWindowStart.toISOString()} - ${reminderWindowEnd.toISOString()})`,
        );

        // Process each booking
        for (const booking of bookings) {
          try {
            // Calculate time until booking in UTC (startsAt is stored in UTC)
            const timeUntilBooking = booking.startsAt.getTime() - now.getTime();
            const hoursUntilBooking = timeUntilBooking / (1000 * 60 * 60);

            // Get salon timezone
            const salonTimezone =
              booking.Studio?.timezone || 'Asia/Ho_Chi_Minh';

            // IMPORTANT: startsAt is stored in UTC but represents the appointment time in studio timezone
            // We need to check if the time difference matches the reminder interval
            // The interval should be calculated from the current time to the booking time
            const targetIntervalMs = intervalMs;
            const minIntervalMs = targetIntervalMs - windowMs;
            const maxIntervalMs = targetIntervalMs + windowMs;

            // Check if the time until booking is within the reminder window
            const isWithinWindow =
              timeUntilBooking >= minIntervalMs &&
              timeUntilBooking <= maxIntervalMs;

            console.log(
              `🔍 Processing booking ${booking.id}: startsAt=${booking.startsAt.toISOString()}, hoursUntil=${hoursUntilBooking.toFixed(2)}, interval=${intervalHours}h, timezone=${salonTimezone}, withinWindow=${isWithinWindow}, targetInterval=${(targetIntervalMs / (1000 * 60 * 60)).toFixed(2)}h, window=[${(minIntervalMs / (1000 * 60 * 60)).toFixed(2)}h, ${(maxIntervalMs / (1000 * 60 * 60)).toFixed(2)}h]`,
            );

            // Skip if not within the precise reminder window
            if (!isWithinWindow) {
              console.log(
                `⏭️ Skipping booking ${booking.id}: not within ${intervalHours}h reminder window (${hoursUntilBooking.toFixed(2)}h until booking)`,
              );
              continue;
            }

            // Get salon reminder settings
            const reminderSettings = booking.Studio.reminderSettings || {
              intervals: [24],
            };
            const salonIntervals = reminderSettings.intervals || [24];

            // Check if this interval is enabled for this salon
            if (!salonIntervals.includes(intervalHours)) {
              console.log(
                `⏭️ Skipping booking ${booking.id}: ${intervalHours}h interval not enabled for salon (enabled: ${salonIntervals.join(', ')})`,
              );
              continue;
            }

            // Check if reminder for this interval was already sent (normalize to numbers: JSON may return strings)
            const rawSent = booking.remindersSentIntervals;
            const sentIntervals = Array.isArray(rawSent)
              ? rawSent.map((x) => Number(x)).filter((n) => !Number.isNaN(n))
              : [];
            if (sentIntervals.includes(intervalHours)) {
              console.log(
                `⏭️ Skipping booking ${booking.id}: ${intervalHours}h reminder already sent (sent: ${sentIntervals.join(', ')})`,
              );
              continue;
            }

            // Re-fetch to avoid duplicate send when cron runs overlap or multiple workers
            const fresh = await this.prisma.sessionBooking.findUnique({
              where: { id: booking.id },
              select: { remindersSentIntervals: true },
            });
            const freshSent = fresh?.remindersSentIntervals;
            const freshIntervals = Array.isArray(freshSent)
              ? freshSent.map((x) => Number(x)).filter((n) => !Number.isNaN(n))
              : [];
            if (freshIntervals.includes(intervalHours)) {
              console.log(
                `⏭️ Skipping booking ${booking.id}: ${intervalHours}h reminder already sent (re-check, sent: ${freshIntervals.join(', ')})`,
              );
              continue;
            }

            // Format date and time for display - convert from UTC to salon's timezone
            // Use date-fns-tz for proper timezone conversion
            // salonTimezone already defined above

            const bookingDate = new Date(booking.startsAt);

            const dateStr = formatInTimeZone(
              bookingDate,
              salonTimezone,
              'EEEE, MMMM d, yyyy',
            );

            // Format time in salon's timezone
            const timeStr = formatInTimeZone(
              bookingDate,
              salonTimezone,
              'hh:mm a',
            );

            const reminderLocale =
              booking.clientEmailLocale === 'ru' ||
              booking.clientEmailLocale === 'vi'
                ? booking.clientEmailLocale
                : 'en';

            // Prepare booking data for email
            const bookingData = {
              serviceName: getLocalizedTrainingName(
                booking.Training,
                reminderLocale,
              ),
              date: dateStr,
              time: timeStr,
              duration: booking.Training.duration,
              price: booking.Training.price,
              salonName: booking.Studio.name,
              salonAddress: booking.Studio.address || undefined,
              salonPhone: booking.Studio.phone || undefined,
              staffName: booking.Trainer?.name || undefined,
              salonTimezone,
              locale: booking.clientEmailLocale as 'en' | 'ru' | 'vi',
            };

            // Send reminder email
            await this.emailService.sendBookingReminder(
              booking.User.email,
              booking.User.name || 'Valued Customer',
              bookingData,
            );

            // Mark this interval as sent (use freshIntervals so we don't overwrite intervals added by another worker)
            const updatedSentIntervals = [...freshIntervals, intervalHours];
            await this.prisma.sessionBooking.update({
              where: { id: booking.id },
              data: {
                reminderSent: true, // Keep for backward compatibility
                remindersSentIntervals: updatedSentIntervals as InputJsonValue,
              },
            });

            console.log(
              `✅ ${intervalHours}h reminder sent for booking ${booking.id} to ${booking.User.email}`,
            );
            this.analytics.track(booking.User.id, 'reminder_sent', {
              booking_id: booking.id,
              studio_id: booking.studioId,
              interval_hours: intervalHours,
              channel: 'email',
            });
            totalSent++;
          } catch (error) {
            console.error(
              `❌ Error sending ${intervalHours}h reminder for booking ${booking.id}:`,
              error,
            );
            totalErrors++;
          }
        }
      }

      console.log(
        `📧 Reminder process completed: ${totalSent} sent, ${totalErrors} errors`,
      );

      if (totalErrors > 0) {
        await this.adminEventLog.log({
          type: 'email_reminder_failed',
          severity: 'warn',
          message: `${totalErrors} booking reminder email(s) failed`,
          metadata: { sent: totalSent, errors: totalErrors },
        });
      }

      return {
        total: totalSent + totalErrors,
        sent: totalSent,
        errors: totalErrors,
      };
    } catch (error) {
      console.error('❌ Error in sendBookingReminders:', error);
      throw error;
    }
  }

  async testReminderSystem() {
    try {
      console.log('🧪 Testing reminder system...');
      const result = await this.sendBookingReminders();
      return {
        success: true,
        message: 'Reminder system test completed',
        data: result,
      };
    } catch (error) {
      console.error('❌ Reminder system test failed:', error);
      return {
        success: false,
        message: 'Reminder system test failed',
        error: error.message,
      };
    }
  }
}
