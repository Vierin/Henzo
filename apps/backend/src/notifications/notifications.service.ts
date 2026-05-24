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

  async savePushToken(
    userId: string,
    token: string,
    platform: string,
    language: string = 'en',
  ): Promise<void> {
    try {
      // Deactivate old tokens for this user on the same platform
      await this.prisma.pushToken.updateMany({
        where: {
          userId,
          platform,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // Check if token already exists
      const existingToken = await this.prisma.pushToken.findUnique({
        where: { token },
      });

      if (existingToken) {
        // Update existing token
        await this.prisma.pushToken.update({
          where: { token },
          data: {
            userId,
            platform,
            language,
            isActive: true,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new token
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

  async getPushTokensBySalonOwner(
    salonId: string,
  ): Promise<Array<{ token: string; language: string }>> {
    try {
      // Find salon owner
      const studio = await this.prisma.studio.findUnique({
        where: { id: salonId },
        select: {
          ownerId: true,
        },
      });

      if (!studio) {
        return [];
      }

      return this.getPushTokensByUserId(studio.ownerId);
    } catch (error) {
      console.error('❌ Error getting push tokens for salon owner:', error);
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
        response.responses.forEach((resp, index) => {
          if (!resp.success) {
            console.error(`❌ Token ${index} failed:`, resp.error);
            errors.push(resp.error?.message ?? 'unknown');
          }
        });
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
    salonId: string,
    bookingId: string,
    clientName: string,
    serviceName: string,
    dateTime: Date,
  ): Promise<void> {
    try {
      console.log(
        `📤 Preparing to send booking notification for salon: ${salonId} (informational)`,
      );
      const tokens = await this.getPushTokensBySalonOwner(salonId);

      console.log(`📱 Found ${tokens.length} push token(s) for salon owner`);
      if (tokens.length > 0) {
        console.log(
          `📱 Tokens:`,
          tokens.map((t) => t.token.substring(0, 30) + '...'),
        );
      }

      if (tokens.length === 0) {
        console.log('⚠️ No push tokens found for salon owner');
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
            salonId,
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
    salonId: string,
    bookingId: string,
    clientName: string,
    serviceName: string,
    dateTime: Date,
  ): Promise<void> {
    try {
      console.log(
        `📤 Preparing to send booking cancellation notification for salon: ${salonId}`,
      );
      const tokens = await this.getPushTokensBySalonOwner(salonId);

      console.log(`📱 Found ${tokens.length} push token(s) for salon owner`);
      if (tokens.length > 0) {
        console.log(
          `📱 Tokens:`,
          tokens.map((t) => t.token.substring(0, 30) + '...'),
        );
      }

      if (tokens.length === 0) {
        console.log('⚠️ No push tokens found for salon owner');
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
          salonId,
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
    salonId: string;
    studioId: string;
    sessionId: string;
    clientName: string;
    trainingName: string;
    startsAt: Date;
  }): Promise<void> {
    try {
      const tokens = await this.getPushTokensBySalonOwner(params.salonId);
      if (tokens.length === 0) {
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
        const title = getNotificationText(language, 'classBookingTitle');
        const body = formatNotificationTemplate(
          getNotificationText(language, 'classBookingBody'),
          {
            client: params.clientName,
            class: params.trainingName || 'class',
          },
        );
        await this.sendPushNotification(
          languageTokens,
          title,
          body,
          {
            type: 'NEW_CLASS_BOOKING',
            sessionId: params.sessionId,
            studioId: params.studioId,
            trainingName: params.trainingName,
            startsAt: params.startsAt.toISOString(),
            clientName: params.clientName,
          },
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
}
