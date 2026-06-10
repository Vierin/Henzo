import { Injectable } from '@nestjs/common';
import { AdminEventLogService } from '../admin/admin-event-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseAdminService } from './firebase-admin.service';
import {
  formatNotificationTemplate,
  getNotificationText,
} from './notification-translations';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private firebaseAdmin: FirebaseAdminService,
    private readonly adminEventLog: AdminEventLogService,
  ) {}

  async deactivatePushTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    await this.prisma.pushToken.updateMany({
      where: { token: { in: tokens } },
      data: { isActive: false },
    });
  }

  async savePushToken(
    userId: string,
    token: string,
    platform: string,
    language: string = 'en',
  ): Promise<void> {
    try {
      // Deactivate other tokens for this user on the same platform.
      await this.prisma.pushToken.updateMany({
        where: {
          userId,
          platform,
          isActive: true,
          NOT: { token },
        },
        data: {
          isActive: false,
        },
      });

      const existingToken = await this.prisma.pushToken.findFirst({
        where: { userId, token },
      });

      if (existingToken) {
        await this.prisma.pushToken.update({
          where: { id: existingToken.id },
          data: {
            platform,
            language,
            isActive: true,
            updatedAt: new Date(),
          },
        });
      } else {
        await this.prisma.pushToken.create({
          data: {
            userId,
            token,
            platform,
            language,
            isActive: true,
          },
        });
      }

      console.log('✅ Push token saved successfully:', {
        userId,
        platform,
        language,
      });
    } catch (error) {
      console.error('❌ Error saving push token:', error);
      throw error;
    }
  }

  /** Send test notification to user (for debugging). Uses channel henzo_default on Android. */
  async sendTestPush(userId: string): Promise<void> {
    const tokens = await this.getPushTokensByUserId(userId);
    console.log(`[Push] test-push: user=${userId} tokens=${tokens.length}`);
    if (tokens.length === 0) {
      console.warn(
        '[Push] test-push: no tokens for user, register from app first',
      );
      throw new Error(
        'No push tokens for this user. Open the app and log in to register a token.',
      );
    }
    await this.sendPushNotification(
      tokens,
      'Henzo Test',
      'If you see this, push works',
      { type: 'TEST' },
      undefined,
      'henzo_default',
    );
    console.log('[Push] test-push sent');
  }

  async getPushTokensByUserId(
    userId: string,
  ): Promise<Array<{ token: string; language: string }>> {
    try {
      const tokens = await this.prisma.pushToken.findMany({
        where: {
          userId,
          isActive: true,
        },
        select: {
          token: true,
          language: true,
        },
      });

      return tokens.map((t) => ({
        token: t.token,
        language: t.language || 'en',
      }));
    } catch (error) {
      console.error('❌ Error getting push tokens:', error);
      return [];
    }
  }

  async createInAppNotification(params: {
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<string> {
    const row = await this.prisma.inAppNotification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        data: params.data ?? {},
      },
      select: { id: true },
    });
    return row.id;
  }

  async listInAppNotifications(
    userId: string,
    limit = 100,
  ): Promise<
    Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      data: Record<string, string>;
      read: boolean;
      createdAt: Date;
    }>
  > {
    const rows = await this.prisma.inAppNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      data: this.normalizeNotificationData(row.data),
      read: row.read,
      createdAt: row.createdAt,
    }));
  }

  async markInAppNotificationsRead(
    userId: string,
    ids?: string[],
  ): Promise<void> {
    await this.prisma.inAppNotification.updateMany({
      where: {
        userId,
        ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
        read: false,
      },
      data: { read: true },
    });
  }

  private normalizeNotificationData(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return Object.entries(value as Record<string, unknown>).reduce(
      (acc, [key, val]) => {
        if (val == null) return acc;
        acc[key] = String(val);
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  async getPushTokensByStudioOwner(
    studioId: string,
  ): Promise<Array<{ token: string; language: string }>> {
    try {
      const studio = await this.prisma.studio.findUnique({
        where: { id: studioId },
        select: {
          ownerId: true,
        },
      });

      if (!studio) {
        return [];
      }

      return this.getPushTokensByUserId(studio.ownerId);
    } catch (error) {
      console.error('❌ Error getting push tokens for studio owner:', error);
      return [];
    }
  }

  async sendPushNotification(
    tokens: Array<{ token: string; language: string }> | string[],
    title: string,
    body: string,
    data?: Record<string, any>,
    actions?: Array<{ action: string; title: string }>,
    androidChannelId?: string,
  ): Promise<void> {
    try {
      console.log(`📤 Sending push notification to ${tokens.length} token(s)`);
      console.log(`   Title: ${title}`);
      console.log(`   Body: ${body}`);
      console.log(`   Data:`, data);

      if (tokens.length === 0) {
        console.log('⚠️ No push tokens available');
        return;
      }

      // Normalize tokens to array of objects
      const tokenObjects: Array<{ token: string; language: string }> =
        tokens.map((t) => {
          if (typeof t === 'string') {
            return { token: t, language: 'en' };
          }
          return t;
        });

      console.log(
        `📱 Sending ${tokenObjects.length} FCM token(s); Expo path removed`,
      );
      if (!this.firebaseAdmin.isInitialized()) {
        console.warn('⚠️ Firebase Admin not initialized. Push cannot be sent.');
        console.warn(
          '   Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_PATH environment variable',
        );
        return;
      }
      const channelId = androidChannelId ?? 'henzo_default';
      console.log(`[Push] FCM channelId: ${channelId}`);
      const response = await this.firebaseAdmin.sendMulticast(
        tokenObjects.map((t) => t.token),
        { title, body },
        data
          ? Object.keys(data).reduce(
              (acc, key) => {
                acc[key] = String(data[key]);
                return acc;
              },
              {} as Record<string, string>,
            )
          : undefined,
        {
          channelId,
          priority: 'high',
          actions,
        },
      );
      console.log(
        `✅ Push notifications sent: ${response.successCount} successful, ${response.failureCount} failed`,
      );
      if (response.failureCount > 0) {
        const errors: string[] = [];
        const deadTokens: string[] = [];
        response.responses.forEach((resp, index) => {
          if (!resp.success) {
            console.error(`❌ Token ${index} failed:`, resp.error);
            errors.push(resp.error?.message ?? 'unknown');
            const code = resp.error?.code ?? '';
            if (
              code.includes('registration-token-not-registered') ||
              code.includes('invalid-registration-token')
            ) {
              const failedToken = tokenObjects[index]?.token;
              if (failedToken) deadTokens.push(failedToken);
            }
          }
        });
        if (deadTokens.length > 0) {
          await this.deactivatePushTokens(deadTokens);
        }
        await this.adminEventLog.log({
          type: 'push_failed',
          severity: 'warn',
          message: `${response.failureCount} FCM delivery failure(s)`,
          metadata: {
            successCount: response.successCount,
            failureCount: response.failureCount,
            errors: errors.slice(0, 10),
          },
        });
      }
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      throw error;
    }
  }

  async sendWorkoutReminderPush(
    userId: string,
    workoutType: string,
  ): Promise<void> {
    const tokens = await this.getPushTokensByUserId(userId);
    if (tokens.length === 0) throw new Error('No push tokens for this user.');
    if (!this.firebaseAdmin.isInitialized()) {
      throw new Error('Firebase Admin not initialized.');
    }
    console.log(
      `📤 Sending workout reminder push: user=${userId} type=${workoutType}`,
    );
    await this.firebaseAdmin.sendMulticast(
      tokens.map((t) => t.token),
      {
        title: `Тренировка "${workoutType}"`,
        body: 'Нажми «Начать» чтобы запустить тренировку на часах',
      },
      { type: 'WORKOUT_REMINDER', workoutType },
      {
        channelId: 'henzo_workout',
        priority: 'high',
        apnsCategory: 'WORKOUT_REMINDER',
      },
    );
  }

  async sendBookingNotification(
    studioId: string,
    bookingId: string,
    clientName: string,
    serviceName: string,
    dateTime: Date,
  ): Promise<void> {
    try {
      console.log(
        `📤 Preparing to send booking notification for studio: ${studioId} (informational)`,
      );
      const tokens = await this.getPushTokensByStudioOwner(studioId);

      console.log(`📱 Found ${tokens.length} push token(s) for studio owner`);
      if (tokens.length > 0) {
        console.log(
          `📱 Tokens:`,
          tokens.map((t) => t.token.substring(0, 30) + '...'),
        );
      }

      if (tokens.length === 0) {
        console.log('⚠️ No push tokens found for studio owner');
        return;
      }

      // Group tokens by language
      const tokensByLanguage = new Map<
        string,
        Array<{ token: string; language: string }>
      >();
      tokens.forEach((tokenObj) => {
        const lang = tokenObj.language || 'en';
        if (!tokensByLanguage.has(lang)) {
          tokensByLanguage.set(lang, []);
        }
        tokensByLanguage.get(lang)!.push(tokenObj);
      });

      // Send notification for each language group
      for (const [language, languageTokens] of tokensByLanguage.entries()) {
        const locale =
          language === 'ru' ? 'ru-RU' : language === 'vi' ? 'vi-VN' : 'en-US';
        const formattedDateStr = new Date(dateTime).toLocaleString(locale, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        const title = getNotificationText(language, 'newBookingConfirmed');
        const verbText = getNotificationText(language, 'booked');
        const body = `${verbText} ${serviceName}`;

        console.log(`📤 Sending booking notification (${language}):`, {
          title,
          body,
          bookingId,
        });

        await this.sendPushNotification(
          languageTokens,
          title,
          body,
          {
            type: 'NEW_BOOKING',
            bookingId,
            studioId,
            clientName,
            serviceName,
            dateTime: dateTime.toISOString(),
            formattedDate: formattedDateStr,
          },
          undefined,
          'henzo_default',
        );
      }

      console.log('✅ Booking notification sent successfully');
    } catch (error) {
      console.error('❌ Error sending booking notification:', error);
      // Don't throw - we don't want to fail booking creation if notification fails
    }
  }

  async sendBookingCancellationNotification(
    studioId: string,
    bookingId: string,
    clientName: string,
    serviceName: string,
    dateTime: Date,
  ): Promise<void> {
    try {
      console.log(
        `📤 Preparing to send booking cancellation notification for studio: ${studioId}`,
      );
      const tokens = await this.getPushTokensByStudioOwner(studioId);

      console.log(`📱 Found ${tokens.length} push token(s) for studio owner`);
      if (tokens.length > 0) {
        console.log(
          `📱 Tokens:`,
          tokens.map((t) => t.token.substring(0, 30) + '...'),
        );
      }

      if (tokens.length === 0) {
        console.log('⚠️ No push tokens found for studio owner');
        return;
      }

      // Group tokens by language
      const tokensByLanguage = new Map<
        string,
        Array<{ token: string; language: string }>
      >();
      tokens.forEach((tokenObj) => {
        const lang = tokenObj.language || 'en';
        if (!tokensByLanguage.has(lang)) {
          tokensByLanguage.set(lang, []);
        }
        tokensByLanguage.get(lang)!.push(tokenObj);
      });

      // Send notification for each language group
      for (const [language, languageTokens] of tokensByLanguage.entries()) {
        const title = getNotificationText(language, 'bookingCancelled');
        const cancelledByText = getNotificationText(language, 'cancelledBy');
        const body = `${cancelledByText} ${clientName}. ${serviceName}`;

        const formattedDate = new Date(dateTime).toLocaleString(
          language === 'ru' ? 'ru-RU' : language === 'vi' ? 'vi-VN' : 'en-US',
          {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          },
        );

        console.log(
          `📤 Sending booking cancellation notification (${language}):`,
          { title, body, bookingId, dateTime },
        );

        await this.sendPushNotification(languageTokens, title, body, {
          type: 'BOOKING_CANCELLED',
          bookingId,
          studioId,
          clientName,
          serviceName,
          dateTime: dateTime.toISOString(),
          formattedDate,
        });
      }

      console.log('✅ Booking cancellation notification sent successfully');
    } catch (error) {
      console.error(
        '❌ Error sending booking cancellation notification:',
        error,
      );
      // Don't throw - we don't want to fail booking cancellation if notification fails
    }
  }

  async sendGroupClassBookingNotification(params: {
    studioId: string;
    sessionId: string;
    enrollmentId?: string;
    clientName: string;
    trainingName: string;
    startsAt: Date;
  }): Promise<void> {
    try {
      console.log(
        `📤 Preparing class booking notification for studio ${params.studioId}`,
      );
      const studio = await this.prisma.studio.findUnique({
        where: { id: params.studioId },
        select: { ownerId: true },
      });
      if (!studio?.ownerId) {
        console.warn(
          '⚠️ Studio owner not found for class booking notification',
        );
        return;
      }

      const tokens = await this.getPushTokensByStudioOwner(params.studioId);
      const ownerLanguage = tokens[0]?.language || 'en';
      const title = getNotificationText(ownerLanguage, 'classBookingTitle');
      const body = formatNotificationTemplate(
        getNotificationText(ownerLanguage, 'classBookingBody'),
        {
          client: params.clientName,
          class: params.trainingName || 'class',
        },
      );
      const pushData: Record<string, string> = {
        type: 'NEW_CLASS_BOOKING',
        sessionId: params.sessionId,
        studioId: params.studioId,
        trainingName: params.trainingName,
        startsAt: params.startsAt.toISOString(),
        clientName: params.clientName,
      };
      if (params.enrollmentId) {
        pushData.enrollmentId = params.enrollmentId;
      }

      const notificationId = await this.createInAppNotification({
        userId: studio.ownerId,
        type: 'NEW_CLASS_BOOKING',
        title,
        body,
        data: pushData,
      });
      pushData.notificationId = notificationId;

      console.log(`📱 Found ${tokens.length} push token(s) for studio owner`);
      if (tokens.length === 0) {
        console.warn(
          '⚠️ No push tokens for studio owner — in-app notification saved only',
        );
        return;
      }
      if (!this.firebaseAdmin.isInitialized()) {
        console.warn(
          '⚠️ Firebase Admin not initialized — in-app notification saved, push skipped',
        );
        return;
      }

      const tokensByLanguage = new Map<
        string,
        Array<{ token: string; language: string }>
      >();
      tokens.forEach((tokenObj) => {
        const lang = tokenObj.language || 'en';
        if (!tokensByLanguage.has(lang)) {
          tokensByLanguage.set(lang, []);
        }
        tokensByLanguage.get(lang)!.push(tokenObj);
      });
      for (const [language, languageTokens] of tokensByLanguage.entries()) {
        const localizedTitle = getNotificationText(
          language,
          'classBookingTitle',
        );
        const localizedBody = formatNotificationTemplate(
          getNotificationText(language, 'classBookingBody'),
          {
            client: params.clientName,
            class: params.trainingName || 'class',
          },
        );
        await this.sendPushNotification(
          languageTokens,
          localizedTitle,
          localizedBody,
          pushData,
          undefined,
          'henzo_default',
        );
      }
    } catch (error) {
      console.error(
        '❌ Error sending group class booking notification:',
        error,
      );
    }
  }

  /** Schedule 24h and 1h pre-class push reminders for an enrollment. */
  async schedulePreClassReminders(
    enrollmentId: string,
    userId: string,
  ): Promise<void> {
    const enrollment = await this.prisma.sessionEnrollment.findFirst({
      where: { id: enrollmentId, userId, status: 'ACTIVE' },
      select: {
        sessionId: true,
        TrainingSession: { select: { startsAt: true } },
      },
    });
    if (!enrollment?.TrainingSession?.startsAt) return;

    const startsAt = enrollment.TrainingSession.startsAt;
    const now = new Date();

    const reminders = [
      {
        type: '24h',
        scheduledFor: new Date(startsAt.getTime() - 24 * 60 * 60 * 1000),
      },
      {
        type: '1h',
        scheduledFor: new Date(startsAt.getTime() - 60 * 60 * 1000),
      },
    ].filter((r) => r.scheduledFor > now);

    if (reminders.length === 0) {
      await this.prisma.scheduledPushReminder.deleteMany({
        where: { enrollmentId, sentAt: null },
      });
      return;
    }

    const typesToKeep = reminders.map((r) => r.type);
    await this.prisma.scheduledPushReminder.deleteMany({
      where: {
        enrollmentId,
        sentAt: null,
        type: { notIn: typesToKeep },
      },
    });

    for (const { type, scheduledFor } of reminders) {
      await this.prisma.scheduledPushReminder.upsert({
        where: { enrollmentId_type: { enrollmentId, type } },
        create: {
          enrollmentId,
          userId,
          sessionId: enrollment.sessionId,
          type,
          scheduledFor,
        },
        update: { scheduledFor, sentAt: null },
      });
    }
  }

  async clearPreClassRemindersForEnrollment(enrollmentId: string) {
    await this.prisma.scheduledPushReminder.deleteMany({
      where: { enrollmentId },
    });
  }

  async clearPreClassRemindersForSession(sessionId: string) {
    await this.prisma.scheduledPushReminder.deleteMany({
      where: { sessionId, sentAt: null },
    });
  }

  /** Called by RemindersScheduler — sends all due push reminders. */
  async sendPendingPushReminders(): Promise<{ sent: number; errors: number }> {
    const now = new Date();
    const pending = await this.prisma.scheduledPushReminder.findMany({
      where: { scheduledFor: { lte: now }, sentAt: null },
      take: 100,
      orderBy: { scheduledFor: 'asc' },
    });

    let sent = 0;
    let errors = 0;

    for (const reminder of pending) {
      try {
        const enrollment = await this.prisma.sessionEnrollment.findFirst({
          where: { id: reminder.enrollmentId, status: 'ACTIVE' },
          select: { id: true },
        });
        if (!enrollment) {
          await this.prisma.scheduledPushReminder.delete({
            where: { id: reminder.id },
          });
          continue;
        }

        const tokens = await this.getPushTokensByUserId(reminder.userId);
        if (tokens.length === 0) {
          continue;
        }

        const session = await this.prisma.trainingSession.findUnique({
          where: { id: reminder.sessionId },
          select: {
            startsAt: true,
            status: true,
            Training: { select: { name: true } },
            Studio: { select: { name: true } },
          },
        });

        if (!session || session.status !== 'ACTIVE') {
          await this.prisma.scheduledPushReminder.delete({
            where: { id: reminder.id },
          });
          continue;
        }

        const lang = tokens[0]?.language || 'en';
        const timeStr = session.startsAt.toLocaleTimeString(
          lang === 'ru' ? 'ru-RU' : lang === 'vi' ? 'vi-VN' : 'en-US',
          { hour: '2-digit', minute: '2-digit', hour12: false },
        );
        const titleKey =
          reminder.type === '24h' ? 'reminder24hTitle' : 'reminder1hTitle';
        const bodyKey =
          reminder.type === '24h' ? 'reminder24hBody' : 'reminder1hBody';

        const title = getNotificationText(lang, titleKey as any);
        const body = formatNotificationTemplate(
          getNotificationText(lang, bodyKey as any),
          {
            class: session.Training?.name || 'class',
            studio: session.Studio?.name || 'studio',
            time: timeStr,
          },
        );

        await this.sendPushNotification(
          tokens,
          title,
          body,
          { type: 'PRE_CLASS_REMINDER', sessionId: reminder.sessionId },
          undefined,
          'henzo_default',
        );

        await this.prisma.scheduledPushReminder.update({
          where: { id: reminder.id },
          data: { sentAt: now },
        });
        sent++;
      } catch (err) {
        errors++;
        console.error('[Notifications] Failed to send push reminder:', err);
      }
    }

    return { sent, errors };
  }

  /**
   * Notify all actively-enrolled clients that a session has been cancelled.
   * Fire-and-forget — errors are swallowed so the caller isn't blocked.
   */
  async notifySessionCancelled(
    sessionId: string,
    sessionInfo: { className: string; studioName: string; startsAt: Date },
  ): Promise<void> {
    try {
      await this.clearPreClassRemindersForSession(sessionId);

      const enrollments = await this.prisma.sessionEnrollment.findMany({
        where: { sessionId, status: 'ACTIVE' },
        select: { userId: true },
      });
      if (enrollments.length === 0) return;

      const dateStr = sessionInfo.startsAt.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      for (const { userId } of enrollments) {
        const tokens = await this.getPushTokensByUserId(userId);
        if (tokens.length === 0) continue;

        const lang = tokens[0]?.language || 'en';
        const title = getNotificationText(lang, 'sessionCancelledTitle' as any);
        const body = formatNotificationTemplate(
          getNotificationText(lang, 'sessionCancelledBody' as any),
          {
            class: sessionInfo.className,
            studio: sessionInfo.studioName,
            date: dateStr,
          },
        );
        await this.sendPushNotification(
          tokens,
          title,
          body,
          { type: 'SESSION_CANCELLED', sessionId },
          undefined,
          'henzo_default',
        );
      }
    } catch (err) {
      console.error('[Notifications] notifySessionCancelled failed:', err);
    }
  }

  /**
   * Notify all actively-enrolled clients that a session has been rescheduled.
   */
  async notifySessionRescheduled(
    sessionId: string,
    sessionInfo: { className: string; studioName: string; newStartsAt: Date },
  ): Promise<void> {
    try {
      const enrollments = await this.prisma.sessionEnrollment.findMany({
        where: { sessionId, status: 'ACTIVE' },
        select: { id: true, userId: true },
      });
      if (enrollments.length === 0) return;

      for (const enrollment of enrollments) {
        try {
          await this.schedulePreClassReminders(
            enrollment.id,
            enrollment.userId,
          );
        } catch (scheduleErr) {
          console.error(
            '[Notifications] reschedule pre-class reminders failed:',
            scheduleErr,
          );
        }
      }

      const dateStr = sessionInfo.newStartsAt.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      for (const enrollment of enrollments) {
        const tokens = await this.getPushTokensByUserId(enrollment.userId);
        if (tokens.length === 0) continue;

        const lang = tokens[0]?.language || 'en';
        const title = getNotificationText(
          lang,
          'sessionRescheduledTitle' as any,
        );
        const body = formatNotificationTemplate(
          getNotificationText(lang, 'sessionRescheduledBody' as any),
          {
            class: sessionInfo.className,
            studio: sessionInfo.studioName,
            date: dateStr,
          },
        );
        await this.sendPushNotification(
          tokens,
          title,
          body,
          { type: 'SESSION_RESCHEDULED', sessionId },
          undefined,
          'henzo_default',
        );
      }
    } catch (err) {
      console.error('[Notifications] notifySessionRescheduled failed:', err);
    }
  }

  /** Push notification to studio owner when a client leaves a new review. */
  async sendNewReviewNotification(params: {
    studioId: string;
    studioName: string;
    clientName: string;
    rating: number;
  }): Promise<void> {
    try {
      const studio = await this.prisma.studio.findUnique({
        where: { id: params.studioId },
        select: { ownerId: true },
      });
      if (!studio?.ownerId) return;

      const tokens = await this.getPushTokensByUserId(studio.ownerId);
      const lang = tokens[0]?.language || 'en';
      const title = getNotificationText(lang, 'newReviewTitle' as any);
      const body = formatNotificationTemplate(
        getNotificationText(lang, 'newReviewBody' as any),
        {
          client: params.clientName,
          rating: String(params.rating),
          studio: params.studioName,
        },
      );
      const pushData = { type: 'NEW_REVIEW', studioId: params.studioId };

      const notificationId = await this.createInAppNotification({
        userId: studio.ownerId,
        type: 'NEW_REVIEW',
        title,
        body,
        data: pushData,
      });

      if (tokens.length === 0 || !this.firebaseAdmin.isInitialized()) return;

      const languageGroups = new Map<string, typeof tokens>();
      for (const t of tokens) {
        const tLang = t.language || 'en';
        if (!languageGroups.has(tLang)) languageGroups.set(tLang, []);
        languageGroups.get(tLang)!.push(t);
      }

      for (const [tLang, langTokens] of languageGroups) {
        const localizedTitle = getNotificationText(
          tLang,
          'newReviewTitle' as any,
        );
        const localizedBody = formatNotificationTemplate(
          getNotificationText(tLang, 'newReviewBody' as any),
          {
            client: params.clientName,
            rating: String(params.rating),
            studio: params.studioName,
          },
        );
        await this.sendPushNotification(
          langTokens,
          localizedTitle,
          localizedBody,
          { ...pushData, notificationId },
          undefined,
          'henzo_default',
        );
      }
    } catch (err) {
      console.error('[Notifications] Failed to send review push:', err);
    }
  }

  /** Push notification to user when promoted from waitlist to enrolled. */
  async sendWaitlistPromotionPush(
    userId: string,
    sessionInfo: { sessionId: string; className: string; studioName: string },
  ): Promise<void> {
    try {
      const tokens = await this.getPushTokensByUserId(userId);
      if (tokens.length === 0) return;

      const languageGroups = new Map<string, typeof tokens>();
      for (const t of tokens) {
        const lang = t.language || 'en';
        if (!languageGroups.has(lang)) languageGroups.set(lang, []);
        languageGroups.get(lang)!.push(t);
      }

      for (const [lang, langTokens] of languageGroups) {
        const title = getNotificationText(lang, 'waitlistPromotedTitle' as any);
        const body = formatNotificationTemplate(
          getNotificationText(lang, 'waitlistPromotedBody' as any),
          { class: sessionInfo.className, studio: sessionInfo.studioName },
        );
        await this.sendPushNotification(
          langTokens,
          title,
          body,
          { type: 'WAITLIST_PROMOTED', sessionId: sessionInfo.sessionId },
          undefined,
          'henzo_default',
        );
      }
    } catch (err) {
      console.error('[Notifications] Failed to send waitlist push:', err);
    }
  }
}
