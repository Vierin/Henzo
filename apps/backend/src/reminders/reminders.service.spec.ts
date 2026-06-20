import { RemindersService } from './reminders.service';

describe('RemindersService', () => {
  it('dispatches reminder email and marks interval as sent', async () => {
    const now = Date.now();
    const booking = {
      id: 'booking-1',
      startsAt: new Date(now + 24 * 60 * 60 * 1000),
      status: 'CONFIRMED',
      reminderSent: false,
      remindersSentIntervals: [],
      studioId: 'studio-1',
      clientEmailLocale: 'en',
      User: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      Training: {
        id: 'training-1',
        name: 'Training',
        duration: 60,
        price: 100,
      },
      Studio: {
        id: 'studio-1',
        name: 'Studio',
        address: 'Address',
        phone: '123',
        reminderSettings: { intervals: [24] },
        timezone: 'Asia/Ho_Chi_Minh',
      },
      Trainer: null,
    };

    const prisma = {
      sessionBooking: {
        findMany: jest.fn().mockResolvedValueOnce([booking]),
        findUnique: jest.fn().mockResolvedValue({ remindersSentIntervals: [] }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const emailService = {
      sendBookingReminder: jest.fn().mockResolvedValue({}),
    };
    const analytics = { track: jest.fn() };
    const adminEventLog = { log: jest.fn().mockResolvedValue(undefined) };

    const service = new RemindersService(
      prisma as any,
      emailService as any,
      analytics as any,
      adminEventLog as any,
    );

    const result = await service.sendBookingReminders();

    expect(result.sent).toBe(1);
    expect(emailService.sendBookingReminder).toHaveBeenCalledTimes(1);
    expect(prisma.sessionBooking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: expect.objectContaining({
          reminderSent: true,
          remindersSentIntervals: [24],
        }),
      }),
    );
  });
});
