import { Injectable, Logger } from '@nestjs/common';
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
    duration: number;
    price: number;
  };
  Studio: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    reminderSettings?: any;
    timezone?: string;
  };
  Trainer: {
    id: string;
    name: string;
  } | null;
};

function getLocalizedTrainingName(
  training: BookingWithRelations['Training'],
  _locale: 'en' | 'ru' | 'vi',
): string {
  return training.name;
}

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private analytics: AnalyticsService,
    private readonly adminEventLog: AdminEventLogService,
  ) {}

  async sendBookingReminders() {
    try {
      const now = new Date();
      const possibleIntervals = [24];
      const windowMinutes = 15;

      let totalSent = 0;
      let totalErrors = 0;

      for (const intervalHours of possibleIntervals) {
        const intervalMs = intervalHours * 60 * 60 * 1000;
        const windowMs = windowMinutes * 60 * 1000;
        const wideWindowMs = 2 * 60 * 60 * 1000;
        const reminderWindowStart = new Date(
          now.getTime() + intervalMs - wideWindowMs,
        );
        const reminderWindowEnd = new Date(
          now.getTime() + intervalMs + wideWindowMs,
        );

        let bookings: BookingWithRelations[];
        try {
          bookings = (await this.prisma.sessionBooking.findMany({
            where: {
              startsAt: {
                gte: reminderWindowStart,
                lte: reminderWindowEnd,
              },
              status: {
                in: ['CONFIRMED'],
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
          if (error.code === 'P2024') {
            this.logger.error(
              'Connection pool timeout while fetching bookings',
            );
            throw new Error(
              'Connection pool exhausted. Please try again later.',
            );
          }
          throw error;
        }

        for (const booking of bookings) {
          try {
            const timeUntilBooking = booking.startsAt.getTime() - now.getTime();
            const salonTimezone =
              booking.Studio?.timezone || 'Asia/Ho_Chi_Minh';
            const minIntervalMs = intervalMs - windowMs;
            const maxIntervalMs = intervalMs + windowMs;
            const isWithinWindow =
              timeUntilBooking >= minIntervalMs &&
              timeUntilBooking <= maxIntervalMs;

            if (!isWithinWindow) {
              continue;
            }

            const reminderSettings = booking.Studio.reminderSettings || {
              intervals: [24],
            };
            const salonIntervals = reminderSettings.intervals || [24];

            if (!salonIntervals.includes(intervalHours)) {
              continue;
            }

            const rawSent = booking.remindersSentIntervals;
            const sentIntervals = Array.isArray(rawSent)
              ? rawSent.map((x) => Number(x)).filter((n) => !Number.isNaN(n))
              : [];
            if (sentIntervals.includes(intervalHours)) {
              continue;
            }

            const fresh = await this.prisma.sessionBooking.findUnique({
              where: { id: booking.id },
              select: { remindersSentIntervals: true },
            });
            const freshSent = fresh?.remindersSentIntervals;
            const freshIntervals = Array.isArray(freshSent)
              ? freshSent.map((x) => Number(x)).filter((n) => !Number.isNaN(n))
              : [];
            if (freshIntervals.includes(intervalHours)) {
              continue;
            }

            const dateStr = formatInTimeZone(
              booking.startsAt,
              salonTimezone,
              'EEEE, MMMM d, yyyy',
            );
            const timeStr = formatInTimeZone(
              booking.startsAt,
              salonTimezone,
              'hh:mm a',
            );

            const reminderLocale =
              booking.clientEmailLocale === 'ru' ||
              booking.clientEmailLocale === 'vi'
                ? booking.clientEmailLocale
                : 'en';

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
              dateTime: booking.startsAt,
              salonTimezone,
              locale: booking.clientEmailLocale as 'en' | 'ru' | 'vi',
            };

            await this.emailService.sendBookingReminder(
              booking.User.email,
              booking.User.name || 'Valued Customer',
              bookingData,
            );

            const updatedSentIntervals = [...freshIntervals, intervalHours];
            await this.prisma.sessionBooking.update({
              where: { id: booking.id },
              data: {
                reminderSent: true,
                remindersSentIntervals: updatedSentIntervals as InputJsonValue,
              },
            });

            this.logger.log(
              `Sent ${intervalHours}h email reminder for booking ${booking.id}`,
            );
            this.analytics.track(booking.User.id, 'reminder_sent', {
              booking_id: booking.id,
              studio_id: booking.studioId,
              interval_hours: intervalHours,
              channel: 'email',
            });
            totalSent++;
          } catch (error) {
            this.logger.error(
              `Failed ${intervalHours}h reminder for booking ${booking.id}`,
              error,
            );
            totalErrors++;
          }
        }
      }

      if (totalSent > 0 || totalErrors > 0) {
        this.logger.log(
          `Email reminders finished: ${totalSent} sent, ${totalErrors} errors`,
        );
      }

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
      this.logger.error('sendBookingReminders failed', error);
      throw error;
    }
  }
}
