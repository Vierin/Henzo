import {
  Injectable,
  Inject,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { supabase } from '../lib/supabase';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { JwtVerifierService } from './jwt-verifier.service';
import * as crypto from 'crypto';
import { renderOtpEmailHtml } from '../email/templates/transactional-email-templates';
import { OTP_EMAIL_STRINGS } from '../email/copy/otp-email.strings';
import { resolveClientEmailLocale } from '../email/copy/client-email-locale';
import { Prisma } from '@prisma/client';

type RegistrationOtpKind = 'client' | 'owner';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Cache for getCurrentUser to prevent duplicate calls
  private getCurrentUserCache = new Map<
    string,
    { result: any; timestamp: number }
  >();
  private readonly CACHE_TTL = 30000; // 30 seconds cache (увеличено с 1 секунды)

  // Кэш для синхронизации app_metadata (ленивая синхронизация)
  private roleSyncCache = new Map<string, { lastSync: number; role: string }>();
  private readonly ROLE_SYNC_TTL = 5 * 60 * 1000; // 5 минут между синхронизациями
  private readonly CLIENT_OTP_TTL_MS = 10 * 60 * 1000;
  private readonly CLIENT_OTP_MAX_ATTEMPTS = 5;

  constructor(
    @Inject(PrismaService) private prisma: any,
    private emailService: EmailService,
    private configService: ConfigService,
    private jwtVerifier: JwtVerifierService,
  ) {}

  private generateOtpCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private hashOtpCode(code: string) {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  private otpPayloadCipherKey(): Buffer {
    const secret =
      this.configService.get<string>('JWT_SECRET')?.trim() || 'henzo-otp';
    return crypto.createHash('sha256').update(`otp-payload:${secret}`).digest();
  }

  private encryptOtpPassword(password: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      this.otpPayloadCipherKey(),
      iv,
    );
    const encrypted = Buffer.concat([
      cipher.update(password, 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
      'base64',
    );
  }

  private decryptOtpPassword(blob: string): string {
    const buf = Buffer.from(blob, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.otpPayloadCipherKey(),
      iv,
    );
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8',
    );
  }

  private sanitizeOtpPayloadForStorage(payload: Record<string, unknown>) {
    const next = { ...payload };
    if (typeof next.password === 'string' && next.password.length > 0) {
      next.passwordEnc = this.encryptOtpPassword(next.password);
      delete next.password;
    }
    return next;
  }

  private restoreOtpPayloadFromStorage(payload: Record<string, unknown>) {
    const next = { ...payload };
    if (typeof next.passwordEnc === 'string') {
      next.password = this.decryptOtpPassword(next.passwordEnc);
      delete next.passwordEnc;
    }
    return next;
  }

  private normalizeEmail(email: string) {
    return email.toLowerCase().trim();
  }

  private redactEmail(email: string): string {
    const at = email.indexOf('@');
    if (at <= 1) return '***';
    return `${email.slice(0, 2)}***${email.slice(at)}`;
  }

  private redactLogDetails(details: unknown): unknown {
    if (!details || typeof details !== 'object') return details;
    const copy = { ...(details as Record<string, unknown>) };
    if (typeof copy.email === 'string') {
      copy.email = this.redactEmail(copy.email);
    }
    return copy;
  }

  private authDebug(message: string, details?: unknown): void {
    if (process.env.NODE_ENV === 'production') return;
    if (details === undefined) {
      this.logger.debug(message);
      return;
    }
    this.logger.debug(
      `${message} ${JSON.stringify(this.redactLogDetails(details))}`,
    );
  }

  private authWarn(message: string, details?: unknown): void {
    if (details === undefined) {
      this.logger.warn(message);
      return;
    }
    this.logger.warn(
      `${message} ${JSON.stringify(this.redactLogDetails(details))}`,
    );
  }

  private authError(message: string, details?: unknown): void {
    if (details === undefined) {
      this.logger.error(message);
      return;
    }
    this.logger.error(
      `${message} ${JSON.stringify(this.redactLogDetails(details))}`,
    );
  }

  /** Role for syncIfMissing auto-provision — never trust user_metadata. */
  private resolveAutoProvisionRole(
    appMetadataRole: unknown,
    hasOwnedStudios: boolean,
  ): 'CLIENT' | 'OWNER' | 'ADMIN' {
    const allowed = new Set(['CLIENT', 'OWNER', 'ADMIN']);
    if (typeof appMetadataRole === 'string' && allowed.has(appMetadataRole)) {
      return appMetadataRole as 'CLIENT' | 'OWNER' | 'ADMIN';
    }
    if (hasOwnedStudios) {
      return 'OWNER';
    }
    return 'CLIENT';
  }

  private async getAuthProvidersByEmail(
    email: string,
  ): Promise<{ userId: string; providers: string[] } | null> {
    const normalized = this.normalizeEmail(email);
    if (!normalized) return null;

    try {
      const rows = await this.prisma.$queryRaw<
        { user_id: string; provider: string }[]
      >`
        SELECT i.user_id, i.provider
        FROM auth.users u
        JOIN auth.identities i ON i.user_id = u.id
        WHERE LOWER(u.email) = ${normalized}
      `;
      if (!rows.length) return null;

      const providers: string[] = Array.from(
        new Set(
          rows
            .map((row) => row.provider)
            .filter((provider): provider is string => Boolean(provider)),
        ),
      );
      return { userId: rows[0].user_id, providers };
    } catch (error) {
      this.authError('Failed to look up auth providers by email:', error);
      return null;
    }
  }

  private throwPasswordRegistrationConflict(providers: string[]): never {
    const oauthProviders = providers.filter(
      (provider) => provider === 'google' || provider === 'apple',
    );
    const hasEmailProvider = providers.includes('email');

    if (hasEmailProvider) {
      throw new BadRequestException('ACCOUNT_EXISTS_LOGIN');
    }
    if (oauthProviders.length === 1 && oauthProviders[0] === 'google') {
      throw new BadRequestException('ACCOUNT_EXISTS_USE_GOOGLE');
    }
    if (oauthProviders.length === 1 && oauthProviders[0] === 'apple') {
      throw new BadRequestException('ACCOUNT_EXISTS_USE_APPLE');
    }
    if (oauthProviders.length > 0) {
      throw new BadRequestException('ACCOUNT_EXISTS_USE_OAUTH');
    }
    throw new BadRequestException('ACCOUNT_EXISTS_LOGIN');
  }

  private async assertPasswordRegistrationAllowed(
    email: string,
    options: { allowGuestUpgrade?: boolean } = {},
  ): Promise<void> {
    const normalized = this.normalizeEmail(email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalized },
    });

    if (existingUser) {
      if (existingUser.role !== 'CLIENT') {
        throw new BadRequestException('ACCOUNT_EXISTS_LOGIN');
      }
      if (existingUser.isGuest && options.allowGuestUpgrade !== false) {
        return;
      }
      if (!existingUser.isGuest) {
        const authLookup = await this.getAuthProvidersByEmail(normalized);
        if (authLookup) {
          this.throwPasswordRegistrationConflict(authLookup.providers);
        }
        throw new BadRequestException('ACCOUNT_EXISTS_LOGIN');
      }
    }

    const authLookup = await this.getAuthProvidersByEmail(normalized);
    if (authLookup) {
      this.throwPasswordRegistrationConflict(authLookup.providers);
    }
  }

  private resolveSignInHintFromProviders(providers: string[]): string | null {
    const hasEmailProvider = providers.includes('email');
    if (hasEmailProvider) return null;

    const hasGoogle = providers.includes('google');
    const hasApple = providers.includes('apple');
    if (hasGoogle && !hasApple) {
      return 'ACCOUNT_EXISTS_USE_GOOGLE';
    }
    if (hasApple && !hasGoogle) {
      return 'ACCOUNT_EXISTS_USE_APPLE';
    }
    if (hasGoogle || hasApple) {
      return 'ACCOUNT_EXISTS_USE_OAUTH';
    }
    return null;
  }

  async getSignInHint(email: string): Promise<{ hint: string | null }> {
    const normalized = this.normalizeEmail(email);
    if (!normalized) {
      return { hint: null };
    }

    const authLookup = await this.getAuthProvidersByEmail(normalized);
    if (!authLookup) {
      return { hint: null };
    }

    return {
      hint: this.resolveSignInHintFromProviders(authLookup.providers),
    };
  }

  private async sendRegistrationOtpEmail(
    email: string,
    code: string,
    kind: RegistrationOtpKind,
    locale?: string,
  ) {
    const loc = resolveClientEmailLocale(locale);
    const L = OTP_EMAIL_STRINGS[loc];
    const isOwner = kind === 'owner';
    await this.emailService.sendEmail({
      to: email,
      subject: isOwner ? L.ownerSubject : L.subject,
      html: renderOtpEmailHtml(code, kind, loc),
      fromName: 'Henzo',
    });
  }

  private async upsertRegistrationOtp(
    email: string,
    kind: RegistrationOtpKind,
    payload: Record<string, unknown>,
  ) {
    const code = this.generateOtpCode();
    const storedPayload = {
      ...this.sanitizeOtpPayloadForStorage(payload),
      kind,
    };
    await this.prisma.clientRegistrationOtp.upsert({
      where: { email },
      update: {
        codeHash: this.hashOtpCode(code),
        expiresAt: new Date(Date.now() + this.CLIENT_OTP_TTL_MS),
        attempts: 0,
        payload: storedPayload,
      },
      create: {
        email,
        codeHash: this.hashOtpCode(code),
        expiresAt: new Date(Date.now() + this.CLIENT_OTP_TTL_MS),
        attempts: 0,
        payload: storedPayload,
      },
    });
    await this.sendRegistrationOtpEmail(email, code, kind);
    return { success: true };
  }

  private otpPayloadKind(payload: unknown): RegistrationOtpKind {
    const kind = (payload as { kind?: string } | null)?.kind;
    return kind === 'owner' ? 'owner' : 'client';
  }

  private async consumeRegistrationOtp(
    email: string,
    code: string,
    expectedKind: RegistrationOtpKind,
  ) {
    const otp = await this.prisma.clientRegistrationOtp.findUnique({
      where: { email },
    });
    if (!otp) {
      throw new BadRequestException('Verification code not requested');
    }
    if (this.otpPayloadKind(otp.payload) !== expectedKind) {
      throw new BadRequestException('Verification code not requested');
    }
    if (Date.now() > new Date(otp.expiresAt).getTime()) {
      await this.prisma.clientRegistrationOtp.delete({ where: { email } });
      throw new BadRequestException('Verification code expired');
    }
    if (otp.attempts >= this.CLIENT_OTP_MAX_ATTEMPTS) {
      await this.prisma.clientRegistrationOtp.delete({ where: { email } });
      throw new BadRequestException('Too many attempts');
    }
    if (this.hashOtpCode((code || '').trim()) !== otp.codeHash) {
      await this.prisma.clientRegistrationOtp.update({
        where: { email },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid verification code');
    }

    await this.prisma.clientRegistrationOtp.delete({ where: { email } });
    return this.restoreOtpPayloadFromStorage(
      otp.payload as Record<string, unknown>,
    );
  }

  async requestClientRegistrationCode(data: {
    email: string;
    password: string;
    name?: string;
    phone?: string;
  }) {
    const email = this.normalizeEmail(data.email);
    if (!email || !data.password || data.password.length < 6) {
      throw new BadRequestException('Invalid registration payload');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser && existingUser.role !== 'CLIENT') {
      throw new BadRequestException('ACCOUNT_EXISTS_LOGIN');
    }

    await this.assertPasswordRegistrationAllowed(email, {
      allowGuestUpgrade: true,
    });

    return this.upsertRegistrationOtp(email, 'client', {
      email,
      password: data.password,
      name: data.name,
      phone: data.phone,
    });
  }

  async requestOwnerRegistrationCode(data: {
    email: string;
    password: string;
    name?: string;
  }) {
    const email = this.normalizeEmail(data.email);
    if (!email || !data.password || data.password.length < 6) {
      throw new BadRequestException('Invalid registration payload');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      const authLookup = await this.getAuthProvidersByEmail(email);
      if (authLookup) {
        this.throwPasswordRegistrationConflict(authLookup.providers);
      }
      throw new BadRequestException('ACCOUNT_EXISTS_LOGIN');
    }

    await this.assertPasswordRegistrationAllowed(email, {
      allowGuestUpgrade: false,
    });

    return this.upsertRegistrationOtp(email, 'owner', {
      email,
      password: data.password,
      name: data.name,
    });
  }

  async verifyClientRegistrationCode(data: { email: string; code: string }) {
    const email = this.normalizeEmail(data.email);
    const payload = await this.consumeRegistrationOtp(
      email,
      data.code,
      'client',
    );
    return this.registerClient(payload as any);
  }

  async verifyOwnerRegistrationCode(data: { email: string; code: string }) {
    const email = this.normalizeEmail(data.email);
    const payload = await this.consumeRegistrationOtp(
      email,
      data.code,
      'owner',
    );
    return this.registerOwnerFromOtp(payload as any);
  }

  /**
   * Owner registration must prove Supabase identity when userId is sent:
   * JWT sub === userId and email matches.
   */
  private async assertRegistrationJwtMatchesUser(
    authHeader: string | undefined,
    userId: string,
    email: string,
  ): Promise<void> {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization required to complete business registration',
      );
    }
    const token = authHeader.substring(7);
    const normalizedEmail = email.toLowerCase().trim();

    let resolvedId: string;
    let resolvedEmail: string | null | undefined;

    try {
      const decoded = await this.jwtVerifier.verifyToken(token);
      resolvedId = this.jwtVerifier.getUserIdFromToken(decoded);
      resolvedEmail = this.jwtVerifier.getEmailFromToken(decoded);
      if (!resolvedEmail) {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data.user) {
          throw new UnauthorizedException('Invalid or expired token');
        }
        resolvedId = data.user.id;
        resolvedEmail = data.user.email;
      }
    } catch (e: any) {
      if (
        e instanceof UnauthorizedException ||
        e instanceof BadRequestException
      ) {
        throw e;
      }
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        throw new UnauthorizedException('Invalid or expired token');
      }
      resolvedId = data.user.id;
      resolvedEmail = data.user.email;
    }

    if (resolvedId !== userId) {
      throw new UnauthorizedException('Token does not match user');
    }
    if (resolvedEmail?.toLowerCase().trim() !== normalizedEmail) {
      throw new BadRequestException('Email does not match authenticated user');
    }
  }

  /** Drop cached GET /auth/user so role changes from registerOwner are visible immediately. */
  private invalidateGetCurrentUserCacheForUserId(
    userId: string | null | undefined,
  ): void {
    if (!userId) return;
    this.getCurrentUserCache.delete(userId);
  }

  private async invalidateGetCurrentUserCacheForAuthHeader(
    authHeader: string | undefined,
  ): Promise<void> {
    if (!authHeader?.startsWith('Bearer ')) return;
    const token = authHeader.substring(7);
    try {
      const decoded = await this.jwtVerifier.verifyToken(token);
      this.invalidateGetCurrentUserCacheForUserId(
        this.jwtVerifier.getUserIdFromToken(decoded),
      );
    } catch {
      // Token unreadable — nothing to invalidate.
    }
  }

  async registerOwner(
    data: {
      userId: string | null;
      email: string;
      password?: string;
      name?: string;
      role?: string;
    },
    options?: { authHeader?: string },
  ) {
    try {
      if (data.role && data.role !== 'OWNER') {
        throw new BadRequestException('Invalid role for business registration');
      }

      let emailConfirmed = false;
      const userId = data.userId;

      if (userId) {
        await this.assertRegistrationJwtMatchesUser(
          options?.authHeader,
          userId,
          data.email,
        );

        // Проверяем, существует ли пользователь в нашей базе данных
        const existingUser = await this.prisma.user.findUnique({
          where: { id: userId },
        });

        if (existingUser) {
          // Пользователь уже существует - обновляем роль на OWNER если нужно
          // Для бизнес-регистрации всегда устанавливаем OWNER
          const targetRole =
            (data.role as 'OWNER' | 'CLIENT' | 'ADMIN') || 'OWNER';

          if (existingUser.role !== targetRole) {
            this.authDebug(
              `🔄 Updating user role from ${existingUser.role} to ${targetRole}`,
            );
            const updatedUser = await this.prisma.user.update({
              where: { id: userId },
              data: {
                role: targetRole,
                name: data.name || existingUser.name,
                email: data.email || existingUser.email,
              },
            });

            // Синхронизируем роль в app_metadata
            try {
              await supabase.auth.admin.updateUserById(userId, {
                app_metadata: {
                  role: targetRole,
                },
              });
              this.authDebug(
                `✅ Role updated to ${targetRole} for user ${userId}`,
              );
            } catch (error) {
              this.authError('⚠️ Failed to sync role to app_metadata:', error);
            }

            return {
              user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                phone: updatedUser.phone,
                role: updatedUser.role,
              },
              emailConfirmed: true,
            };
          }

          // Пользователь уже имеет нужную роль - но все равно синхронизируем в app_metadata
          this.authDebug(
            `ℹ️ User already has role ${existingUser.role}, syncing to app_metadata`,
          );

          // Синхронизируем роль в app_metadata даже если она уже правильная
          // Это гарантирует, что роль будет в JWT токене
          try {
            await supabase.auth.admin.updateUserById(userId, {
              app_metadata: {
                role: targetRole,
              },
            });
            this.authDebug(
              `✅ Role synced to app_metadata for user ${userId}: ${targetRole}`,
            );
          } catch (error) {
            this.authError('⚠️ Failed to sync role to app_metadata:', error);
          }

          return {
            user: {
              id: existingUser.id,
              email: existingUser.email,
              name: existingUser.name,
              phone: existingUser.phone,
              role: existingUser.role,
            },
            emailConfirmed: true,
          };
        }

        // Для OAuth регистрации email уже подтвержден
        // Проверяем статус подтверждения email в Supabase
        try {
          const { data: authUser } =
            await supabase.auth.admin.getUserById(userId);
          emailConfirmed = authUser?.user?.email_confirmed_at !== null;
          this.authDebug(
            `📧 Email confirmed status for user ${userId}:`,
            emailConfirmed,
          );
        } catch (error) {
          this.authError(
            '⚠️ Failed to check email confirmation status:',
            error,
          );
          // Для OAuth предполагаем, что email подтвержден
          emailConfirmed = true;
        }
      } else {
        throw new Error('UserId is required for non-invite registrations');
      }

      // Проверяем что userId определен
      if (!userId) {
        this.authError('❌ userId is null or undefined');
        throw new Error('Failed to get user ID');
      }

      this.authDebug('✅ userId confirmed:', userId);

      // Используем upsert для избежания ошибок при race conditions
      // (например, если getCurrentUser уже создал пользователя)
      this.authDebug('📝 Creating/updating user in database...');
      try {
        const user = await this.prisma.user.upsert({
          where: { id: userId },
          update: {
            // Обновляем роль на OWNER если нужно (для бизнес-регистрации)
            role: (data.role as 'OWNER' | 'CLIENT' | 'ADMIN') || 'OWNER',
            email: data.email || undefined,
            name: data.name || undefined,
          },
          create: {
            id: userId,
            email: data.email,
            name: data.name,
            role: (data.role as 'OWNER' | 'CLIENT' | 'ADMIN') || 'OWNER',
          },
        });

        this.authDebug('✅ User created/updated in database:', {
          id: user.id,
          email: user.email,
          role: user.role,
        });

        // Синхронизируем роль в app_metadata Supabase (если еще не установлена)
        // Это гарантирует, что роль будет в JWT токене
        try {
          const { data: existingUser } =
            await supabase.auth.admin.getUserById(userId);
          const currentRole =
            existingUser?.user?.app_metadata?.role ||
            existingUser?.user?.user_metadata?.role;

          if (currentRole !== user.role) {
            await supabase.auth.admin.updateUserById(userId, {
              app_metadata: {
                role: user.role,
              },
            });
            this.authDebug(
              `✅ Role synced to app_metadata for user ${userId}: ${user.role}`,
            );
          } else {
            this.authDebug(
              `ℹ️ Role already set in app_metadata for user ${userId}: ${user.role}`,
            );
          }
        } catch (error) {
          this.authError('⚠️ Failed to sync role to app_metadata:', error);
          // Не блокируем регистрацию, если не удалось обновить метаданные
        }

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role,
          },
          emailConfirmed,
        };
      } catch (upsertError: any) {
        this.authError('❌ Error in user upsert:', {
          message: upsertError.message,
          code: upsertError.code,
          meta: upsertError.meta,
        });

        // Если ошибка из-за уникальности, пытаемся получить пользователя
        if (
          upsertError.code === 'P2002' ||
          upsertError.message?.includes('Unique constraint')
        ) {
          this.authDebug(
            '⚠️ Unique constraint error, trying to find existing user...',
          );
          const existingUser = await this.prisma.user.findUnique({
            where: { id: userId },
          });

          if (existingUser) {
            // Обновляем роль на OWNER
            const updatedUser = await this.prisma.user.update({
              where: { id: userId },
              data: {
                role: (data.role as 'OWNER' | 'CLIENT' | 'ADMIN') || 'OWNER',
              },
            });

            // Синхронизируем роль в app_metadata
            try {
              await supabase.auth.admin.updateUserById(userId, {
                app_metadata: {
                  role: updatedUser.role,
                },
              });
              this.authDebug(`✅ Role updated and synced for user ${userId}`);
            } catch (error) {
              this.authError('⚠️ Failed to sync role to app_metadata:', error);
            }

            return {
              user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                phone: updatedUser.phone,
                role: updatedUser.role,
              },
              emailConfirmed: true,
            };
          }
        }

        throw upsertError;
      }
    } catch (error: any) {
      this.authError('❌ registerOwner error:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name,
        data: {
          userId: data.userId,
          email: data.email,
          hasPassword: !!data.password,
        },
      });
      throw new Error(
        `Owner registration failed: ${error.message || 'Unknown error'}`,
      );
    } finally {
      this.invalidateGetCurrentUserCacheForUserId(data.userId);
      await this.invalidateGetCurrentUserCacheForAuthHeader(
        options?.authHeader,
      );
    }
  }

  private async confirmExistingUser(userId: string): Promise<boolean> {
    try {
      // Пытаемся с несколькими попытками вместо большой задержки
      let retries = 3;
      let existingAuthUser: any = null;
      let getUserError: any = null;

      while (retries > 0) {
        const result = await supabase.auth.admin.getUserById(userId);
        existingAuthUser = result.data?.user;
        getUserError = result.error;

        if (existingAuthUser) break;

        // Короткая задержка перед повторной попыткой (200ms вместо 1500ms)
        await new Promise((resolve) => setTimeout(resolve, 200));
        retries--;
      }

      if (getUserError || !existingAuthUser) {
        this.authError(
          '❌ User not found in Supabase after retries:',
          getUserError,
        );
        return false;
      }

      // Пользователь существует, подтверждаем email
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          email_confirm: true,
        },
      );

      if (updateError) {
        this.authError('❌ Failed to confirm email:', updateError);
        return false;
      }

      this.authDebug('✅ Email confirmed successfully for userId:', userId);
      return true;
    } catch (error) {
      this.authError('❌ Error confirming existing user:', error);
      return false;
    }
  }

  async registerClient(data: {
    email: string;
    password: string;
    name?: string;
    phone?: string;
  }) {
    try {
      const email = this.normalizeEmail(data.email);
      this.authDebug('🔐 Starting client registration for:', email);

      await this.assertPasswordRegistrationAllowed(email, {
        allowGuestUpgrade: true,
      });

      // Проверяем, существует ли пользователь в нашей базе данных
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        // Если пользователь уже есть и это не клиент — блокируем регистрацию
        if (existingUser.role !== 'CLIENT') {
          this.authDebug(
            '❌ User with this email exists but is not a client:',
            email,
          );
          throw new BadRequestException('ACCOUNT_EXISTS_LOGIN');
        }

        // Вариант 3: "апгрейд" гостевого клиента до полноценного аккаунта
        if (existingUser.isGuest) {
          this.authDebug(
            '🔁 Upgrading guest client user to full account:',
            data.email,
          );

          // Email уже подтвержден при подтверждении бронирования через magic link
          // Используем Admin API для создания пользователя с уже подтвержденным email
          this.authDebug(
            '📧 Creating user in Supabase with confirmed email via Admin API (email already verified via booking confirmation)...',
          );
          const { data: authData, error: authError } =
            await supabase.auth.admin.createUser({
              email: data.email,
              password: data.password,
              email_confirm: true, // Email уже подтвержден при подтверждении бронирования
              user_metadata: {
                name: data.name,
                phone: data.phone,
              },
              app_metadata: {
                role: 'CLIENT',
              },
            });

          if (authError) {
            this.authError(
              '❌ Supabase auth error while upgrading guest client:',
              authError.message,
            );

            // Если пользователь уже существует в Supabase, пытаемся войти
            if (
              authError.message?.includes('already been registered') ||
              authError.message?.includes('already exists')
            ) {
              this.authDebug(
                '⚠️ User already exists in Supabase, attempting to sign in...',
              );

              const { data: signInData, error: signInError } =
                await supabase.auth.signInWithPassword({
                  email: data.email,
                  password: data.password,
                });

              if (signInError) {
                throw new Error(
                  'User already exists. Please use login instead.',
                );
              }

              // Обновляем данные существующего пользователя в нашей БД
              const user = await this.prisma.user.update({
                where: { email: data.email },
                data: {
                  name: data.name ?? existingUser.name,
                  phone: data.phone ?? existingUser.phone,
                  role: 'CLIENT',
                  isGuest: false,
                  id: signInData.user.id, // Обновляем ID если он изменился
                },
              });

              // Синхронизируем роль в app_metadata Supabase
              try {
                await supabase.auth.admin.updateUserById(signInData.user.id, {
                  app_metadata: {
                    role: 'CLIENT',
                  },
                });
                this.authDebug(
                  `✅ Role synced to app_metadata for upgraded client ${signInData.user.id}`,
                );
              } catch (error) {
                this.authError(
                  '⚠️ Failed to sync role to app_metadata for upgraded client:',
                  error,
                );
              }

              return {
                user: {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  phone: user.phone,
                  role: user.role,
                },
                session: signInData.session,
                emailConfirmed: true, // Email уже подтвержден при подтверждении бронирования
              };
            }

            throw new Error(authError.message);
          }

          if (!authData.user) {
            this.authError(
              '❌ No user data returned from Supabase while upgrading guest client',
            );
            throw new Error('Failed to create user');
          }

          this.authDebug(
            '✅ Guest client user created in Supabase with confirmed email:',
            authData.user.id,
          );

          // Обновляем данные существующего пользователя в нашей БД
          const user = await this.prisma.user.update({
            where: { email: data.email },
            data: {
              name: data.name ?? existingUser.name,
              phone: data.phone ?? existingUser.phone,
              role: 'CLIENT',
              isGuest: false,
            },
          });

          // Синхронизируем роль в app_metadata Supabase
          try {
            await supabase.auth.admin.updateUserById(authData.user.id, {
              app_metadata: {
                role: 'CLIENT',
              },
            });
            this.authDebug(
              `✅ Role synced to app_metadata for upgraded client ${authData.user.id}`,
            );
          } catch (error) {
            this.authError(
              '⚠️ Failed to sync role to app_metadata for upgraded client:',
              error,
            );
          }

          // Admin API не возвращает session, нужно войти для получения сессии
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email: data.email,
              password: data.password,
            });

          if (signInError || !signInData.session) {
            this.authWarn(
              '⚠️ Could not create session after user creation, but user was created successfully',
            );
            // Возвращаем без сессии - фронтенд может попросить пользователя войти
            return {
              user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role,
              },
              session: null,
              emailConfirmed: true, // Email уже подтвержден при подтверждении бронирования
            };
          }

          return {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              phone: user.phone,
              role: user.role,
            },
            session: signInData.session,
            emailConfirmed: true, // Email уже подтвержден при подтверждении бронирования
          };
        }

        // Если пользователь уже существует и не является гостем-клиентом —
        // считаем, что аккаунт уже полностью зарегистрирован.
        this.authDebug('❌ User already exists as full client:', email);
        const authLookup = await this.getAuthProvidersByEmail(email);
        if (authLookup) {
          this.throwPasswordRegistrationConflict(authLookup.providers);
        }
        throw new BadRequestException('ACCOUNT_EXISTS_LOGIN');
      }

      this.authDebug(
        '✅ User not found in database, proceeding with registration',
      );

      // Создаем пользователя через Admin API с подтвержденным email:
      // подтверждение мы уже сделали через OTP от Henzo.
      this.authDebug(
        '📧 Creating user in Supabase (admin, email confirmed)...',
      );
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password: data.password,
          email_confirm: true,
          user_metadata: {
            name: data.name,
            phone: data.phone,
          },
          app_metadata: {
            role: 'CLIENT',
          },
        });

      if (authError) {
        this.authError('❌ Supabase auth error:', authError.message);
        if (
          authError.message?.includes('already been registered') ||
          authError.message?.includes('already exists')
        ) {
          const authLookup = await this.getAuthProvidersByEmail(email);
          if (authLookup) {
            this.throwPasswordRegistrationConflict(authLookup.providers);
          }
          throw new BadRequestException('ACCOUNT_EXISTS_LOGIN');
        }
        throw new Error(authError.message);
      }

      if (!authData.user) {
        this.authError('❌ No user data returned from Supabase');
        throw new Error('Failed to create user');
      }

      this.authDebug('✅ User created in Supabase:', authData.user.id);

      // Создаем запись пользователя в нашей базе данных
      const user = await this.prisma.user.create({
        data: {
          id: authData.user.id,
          email,
          name: data.name,
          phone: data.phone,
          role: 'CLIENT',
        },
      });

      // Синхронизируем роль в app_metadata Supabase
      // Это гарантирует, что роль будет в JWT токене
      try {
        await supabase.auth.admin.updateUserById(authData.user.id, {
          app_metadata: {
            role: 'CLIENT',
          },
        });
        this.authDebug(
          `✅ Role synced to app_metadata for client ${authData.user.id}`,
        );
      } catch (error) {
        this.authError('⚠️ Failed to sync role to app_metadata:', error);
        // Не блокируем регистрацию, если не удалось обновить метаданные
      }

      // Получаем session после создания (admin.createUser не возвращает её).
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password: data.password,
        });
      if (signInError) {
        throw new Error(signInError.message || 'Failed to create session');
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
        session: signInData.session,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  private async registerOwnerFromOtp(data: {
    email: string;
    password: string;
    name?: string;
  }) {
    const email = this.normalizeEmail(data.email);
    await this.assertPasswordRegistrationAllowed(email, {
      allowGuestUpgrade: false,
    });

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          name: data.name,
        },
        app_metadata: {
          role: 'OWNER',
        },
      });

    if (authError) {
      if (
        authError.message?.includes('already been registered') ||
        authError.message?.includes('already exists')
      ) {
        const authLookup = await this.getAuthProvidersByEmail(email);
        if (authLookup) {
          this.throwPasswordRegistrationConflict(authLookup.providers);
        }
        throw new BadRequestException('ACCOUNT_EXISTS_LOGIN');
      }
      throw new BadRequestException(
        authError.message || 'Failed to create user',
      );
    }
    if (!authData.user) {
      throw new BadRequestException('Failed to create user');
    }

    const user = await this.prisma.user.create({
      data: {
        id: authData.user.id,
        email,
        name: data.name,
        role: 'OWNER',
      },
    });

    try {
      await supabase.auth.admin.updateUserById(authData.user.id, {
        app_metadata: { role: 'OWNER' },
      });
    } catch (error) {
      this.authError('⚠️ Failed to sync owner role to app_metadata:', error);
    }

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password: data.password,
      });
    if (signInError) {
      throw new BadRequestException(
        signInError.message || 'Failed to create session',
      );
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      session: signInData.session,
      emailConfirmed: true,
    };
  }

  async loginClient(data: { email: string; password: string }) {
    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error('Login failed');
      }

      // Получаем информацию о пользователе из нашей базы данных
      // Используем email как стабильный идентификатор между Supabase и нашей БД
      const user = await this.prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (!user) {
        throw new Error('User not found in database');
      }

      if (user.role !== 'CLIENT') {
        throw new Error('Only clients can access this endpoint');
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
        session: authData.session,
      };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async getCurrentUser(
    authHeader: string,
    options: { syncIfMissing?: boolean } = {},
  ) {
    try {
      this.authDebug(
        '🔐 Getting current user, authHeader:',
        authHeader ? 'Present' : 'Missing',
      );

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        this.authDebug('❌ No valid authorization header provided');
        throw new Error('No authorization header provided');
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      this.authDebug('🔑 Token extracted, length:', token.length);

      // Локальная верификация JWT (быстро, без сетевых запросов)
      let decodedToken: any;
      let user: any;

      try {
        this.authDebug('🔍 Verifying token locally (JWT)...');
        decodedToken = await this.jwtVerifier.verifyToken(token);

        // Создаем объект user из decoded token для совместимости
        user = {
          id: this.jwtVerifier.getUserIdFromToken(decodedToken),
          email: this.jwtVerifier.getEmailFromToken(decodedToken),
          app_metadata: decodedToken.app_metadata || {},
          user_metadata: decodedToken.user_metadata || {},
        };

        this.authDebug('✅ Token verified locally:', {
          id: user.id,
          email: user.email,
        });
      } catch (jwtError: any) {
        // Fallback на Supabase API если локальная верификация не удалась
        // (например, ключи еще не загружены или токен использует другой алгоритм)
        this.authDebug(
          '⚠️ Local JWT verification failed, falling back to Supabase API:',
          jwtError.message,
        );
        this.authDebug('🔍 Verifying token with Supabase API (fallback)...');

        const {
          data: { user: supabaseUser },
          error,
        } = await supabase.auth.getUser(token);

        if (error) {
          this.authError(
            '❌ Supabase token verification error:',
            error.message,
          );
          const cause = (error as { cause?: { code?: string } }).cause;
          if (cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
            throw new Error('Auth service unavailable');
          }
          throw new Error('Invalid token');
        }

        if (!supabaseUser) {
          this.authDebug('❌ No user returned from Supabase');
          throw new Error('User not found');
        }

        user = supabaseUser;
        this.authDebug('✅ User verified via Supabase API (fallback):', {
          id: user.id,
          email: user.email,
        });
      }

      const cacheKey = user.id;
      const now = Date.now();
      const cached = this.getCurrentUserCache.get(cacheKey);
      if (cached && now - cached.timestamp < this.CACHE_TTL) {
        this.authDebug('✅ Using cached getCurrentUser result for', cacheKey);
        return cached.result;
      }

      // Get user data from our database
      // IMPORTANT: we use email as the stable link between Supabase and our DB,
      // because some users (e.g. guests created via bookings) may have been
      // created before a Supabase account existed.
      this.authDebug('🔍 Looking up user in database...');
      if (!user.email) {
        throw new Error('User email is missing');
      }
      let dbUser = await this.prisma.user.findUnique({
        where: { email: user.email.toLowerCase() },
      });

      // Ленивая синхронизация роли в app_metadata
      // Синхронизируем только если:
      // 1. Роль в БД отличается от роли в токене
      // 2. И прошло больше 5 минут с последней синхронизации
      if (dbUser) {
        const currentRole = user.app_metadata?.role || user.user_metadata?.role;
        const syncCacheKey = user.id;
        const syncCache = this.roleSyncCache.get(syncCacheKey);
        const now = Date.now();

        const shouldSync =
          currentRole !== dbUser.role &&
          (!syncCache ||
            syncCache.role !== dbUser.role ||
            now - syncCache.lastSync > this.ROLE_SYNC_TTL);

        if (shouldSync) {
          // Синхронизируем в фоне (не блокируем ответ)
          this.syncRoleToAppMetadata(user.id, dbUser.role).catch((error) => {
            this.authError('⚠️ Background role sync failed:', error);
          });

          // Обновляем кэш синхронизации
          this.roleSyncCache.set(syncCacheKey, {
            lastSync: now,
            role: dbUser.role,
          });
        }
      }

      // If user not found by ID, try to find by email (for Google OAuth cases)
      if (!dbUser && user.email) {
        this.authDebug('🔍 User not found by ID, trying to find by email...');
        dbUser = await this.prisma.user.findUnique({
          where: { email: user.email },
        });

        if (dbUser) {
          this.authDebug(
            '✅ Found existing user by email, updating ID to match Supabase Auth...',
          );
          const oldUserId = dbUser.id;

          // Update all related records to use the new Supabase Auth ID
          await this.prisma.$transaction(async (prisma) => {
            // Update studios
            await prisma.studio.updateMany({
              where: { ownerId: oldUserId },
              data: { ownerId: user.id },
            });

            // Update bookings
            await prisma.sessionBooking.updateMany({
              where: { userId: oldUserId },
              data: { userId: user.id },
            });

            // Update reviews
            await prisma.review.updateMany({
              where: { userId: oldUserId },
              data: { userId: user.id },
            });

            // Update user ID
            await prisma.user.update({
              where: { id: oldUserId },
              data: { id: user.id },
            });
          });

          // Get updated user
          dbUser = await this.prisma.user.findUnique({
            where: { id: user.id },
          });
        }
      }

      if (!dbUser) {
        if (!options.syncIfMissing) {
          this.authDebug(
            '❌ User not found in database (login without registration):',
            user.email,
          );
          throw new Error('ACCOUNT_NOT_FOUND');
        }

        // Registration / explicit sync: create user from Supabase Auth identity.
        this.authDebug(
          '⚠️ User not found in database, creating automatically...',
        );
        try {
          // Only app_metadata.role is trusted (service-role writes).
          // user_metadata.role is user-writable — never use it for provisioning.
          const roleFromAppMetadata = user.app_metadata?.role;

          // Проверяем, есть ли у пользователя студии (для восстановления роли OWNER).
          const existingStudios = await this.prisma.studio.findMany({
            where: { ownerId: user.id },
          });

          const userRole = this.resolveAutoProvisionRole(
            roleFromAppMetadata,
            existingStudios.length > 0,
          );

          this.authDebug('📝 Creating user with role:', {
            roleFromAppMetadata,
            hasStudios: existingStudios.length > 0,
            finalRole: userRole,
            userId: user.id,
          });

          // Проверяем, не существует ли пользователь с таким email (для Google OAuth случаев)
          const existingUserByEmail = user.email
            ? await this.prisma.user.findUnique({
                where: { email: user.email },
              })
            : null;

          if (existingUserByEmail && existingUserByEmail.id !== user.id) {
            // Пользователь с таким email уже существует, но с другим ID
            // Это может быть случай, когда пользователь регистрировался через email, а потом логинился через Google
            this.authDebug(
              '⚠️ User with same email exists but different ID, updating ID...',
            );
            // Обновляем ID существующего пользователя на новый из Supabase Auth
            await this.prisma.$transaction(async (prisma) => {
              // Update studios
              await prisma.studio.updateMany({
                where: { ownerId: existingUserByEmail.id },
                data: { ownerId: user.id },
              });

              // Update bookings
              await prisma.sessionBooking.updateMany({
                where: { userId: existingUserByEmail.id },
                data: { userId: user.id },
              });

              // Update reviews
              await prisma.review.updateMany({
                where: { userId: existingUserByEmail.id },
                data: { userId: user.id },
              });

              // Update user ID
              await prisma.user.update({
                where: { id: existingUserByEmail.id },
                data: { id: user.id },
              });
            });

            // Get updated user
            dbUser = await this.prisma.user.findUnique({
              where: { id: user.id },
            });
          } else {
            // Используем upsert вместо create для избежания ошибок при race conditions
            // НЕ обновляем роль в update, только при создании - чтобы не перезаписать роль, установленную через registerOwner
            dbUser = await this.prisma.user.upsert({
              where: { id: user.id },
              update: {
                // Обновляем только данные, но НЕ роль - роль может быть уже установлена через registerOwner
                email: user.email || undefined,
                name:
                  user.user_metadata?.name ||
                  user.user_metadata?.full_name ||
                  undefined,
                phone: user.user_metadata?.phone || undefined,
              },
              create: {
                id: user.id,
                email: user.email || '',
                name:
                  user.user_metadata?.name ||
                  user.user_metadata?.full_name ||
                  null,
                phone: user.user_metadata?.phone || null,
                role: userRole as 'CLIENT' | 'OWNER' | 'ADMIN',
              },
            });
          }

          if (dbUser) {
            this.authDebug(
              `✅ User created/updated automatically in database with role ${dbUser.role}:`,
              dbUser.id,
            );
          } else {
            throw new Error('Failed to create or retrieve user from database');
          }
        } catch (createError: any) {
          this.authError('❌ Failed to create/update user in database:', {
            message: createError.message,
            code: createError.code,
          });
          // Если ошибка из-за уникальности, пытаемся получить пользователя еще раз
          if (
            createError.message?.includes('Unique constraint') ||
            createError.code === 'P2002'
          ) {
            // Try to find by email first
            if (user.email) {
              dbUser = await this.prisma.user.findUnique({
                where: { email: user.email },
              });
            }
            // If still not found, try by ID
            if (!dbUser) {
              dbUser = await this.prisma.user.findUnique({
                where: { id: user.id },
              });
            }
            if (dbUser) {
              this.authDebug(
                '✅ User found after unique constraint error:',
                dbUser.id,
              );
            } else {
              this.authError('❌ User not found after unique constraint error');
              throw new Error(
                `Failed to create user in database: ${createError.message}`,
              );
            }
          } else {
            throw new Error(
              `Failed to create user in database: ${createError.message}`,
            );
          }
        }
      }

      if (!dbUser) {
        this.authError('❌ User not found in database after all attempts');
        throw new Error('User not found in database');
      }

      this.authDebug('✅ User found in database:', {
        id: dbUser.id,
        email: dbUser.email,
      });

      const result = {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          phone: dbUser.phone,
          avatarUrl: dbUser.avatarUrl,
          role: dbUser.role,
        },
      };

      // Cache the result per Supabase user id (not JWT header — same for all tokens).
      this.getCurrentUserCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
      });

      // Clean up old cache entries
      for (const [key, value] of this.getCurrentUserCache.entries()) {
        if (Date.now() - value.timestamp > this.CACHE_TTL * 2) {
          this.getCurrentUserCache.delete(key);
        }
      }

      return result;
    } catch (error: any) {
      if (error?.message === 'ACCOUNT_NOT_FOUND') {
        throw error;
      }
      this.authError('❌ Error in getCurrentUser:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      throw new Error(
        `Failed to get user: ${error.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Verifies the exact session used for a privileged request.
   * This deliberately bypasses the user cache: two sessions belonging to the
   * same account can have different authentication methods.
   */
  async getVerifiedAuthenticationContext(authHeader: string): Promise<{
    userId: string;
    provider: string | null;
    providers: string[];
    methods: { method: string; timestamp: number }[];
    assuranceLevel: string | null;
  }> {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization required');
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = await this.jwtVerifier.verifyToken(token);
    } catch {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      decoded = this.jwtVerifier.decodeToken(token);
      if (!decoded || decoded.sub !== data.user.id) {
        throw new UnauthorizedException('Invalid token claims');
      }
    }

    const context = this.jwtVerifier.getAuthenticationContextFromToken(decoded);

    return {
      userId: this.jwtVerifier.getUserIdFromToken(decoded),
      ...context,
    };
  }

  /**
   * Синхронизировать роль в app_metadata Supabase (в фоне)
   */
  private async syncRoleToAppMetadata(
    userId: string,
    role: string,
  ): Promise<void> {
    try {
      await supabase.auth.admin.updateUserById(userId, {
        app_metadata: {
          role: role,
        },
      });
      this.authDebug(
        `✅ Role synced to app_metadata for user ${userId}: ${role}`,
      );
    } catch (error) {
      this.authError('⚠️ Failed to sync role to app_metadata:', error);
      throw error;
    }
  }

  /**
   * Batch endpoint для инициализации пользователя
   * Возвращает пользователя и опционально студию (для OWNER)
   * Один запрос вместо нескольких
   */
  async initializeUser(
    authHeader: string,
    options: { includeStudio?: boolean } = {},
  ) {
    try {
      // Получаем пользователя (использует кэш)
      const userResult = await this.getCurrentUser(authHeader);
      const user = userResult.user;

      const result: any = {
        user,
      };

      // Если OWNER и запрошена студия, получаем ее.
      if (options.includeStudio && user.role === 'OWNER') {
        try {
          const studio = await this.prisma.studio.findFirst({
            where: { ownerId: user.id },
            select: {
              id: true,
              name: true,
              slug: true,
              address: true,
              phone: true,
              email: true,
              description: true,
              photos: true,
              photoGallery: true,
              status: true,
              autoConfirmBookings: true,
            },
          });

          if (studio) {
            result.studio = studio;
            result.needsSetup = false;
          } else {
            result.needsSetup = true;
          }
        } catch (studioError) {
          this.authError('⚠️ Error fetching studio:', studioError);
          result.needsSetup = true;
        }
      }

      return result;
    } catch (error: any) {
      this.authError('❌ Error in initializeUser:', {
        message: error.message,
        stack: error.stack,
      });
      throw new Error(
        `Failed to initialize user: ${error.message || 'Unknown error'}`,
      );
    }
  }

  async updateUserProfile(userId: string, data: UpdateProfileDto) {
    try {
      // Update user in database
      const updatedUser = await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          name: data.name,
          phone: data.phone,
          ...(data.avatarUrl !== undefined
            ? { avatarUrl: data.avatarUrl || null }
            : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          avatarUrl: true,
          role: true,
        },
      });

      // Invite creates Trainer with email-prefix placeholder; keep it in sync
      // when the linked user updates their profile.
      const trainerPatch: { name?: string; phone?: string } = {};
      const name = data.name?.trim();
      const phone = data.phone?.trim();
      if (name) trainerPatch.name = name;
      if (phone) trainerPatch.phone = phone;
      if (Object.keys(trainerPatch).length > 0) {
        await this.prisma.trainer.updateMany({
          where: { userId },
          data: trainerPatch,
        });
      }

      return updatedUser;
    } catch (error) {
      throw new Error(`Failed to update user profile: ${error.message}`);
    }
  }

  async getUserRole(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user.role;
    } catch (error) {
      throw new Error(`Failed to get user role: ${error.message}`);
    }
  }

  async updateUserRole(
    userId: string,
    role: 'CLIENT' | 'OWNER' | 'ADMIN',
    options?: { allowPrivilegeEscalation?: boolean },
  ) {
    try {
      if (
        !options?.allowPrivilegeEscalation &&
        (role === 'OWNER' || role === 'ADMIN')
      ) {
        throw new Error('Privilege escalation is not allowed');
      }
      // Обновляем роль в базе данных
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
        },
      });

      // Синхронизируем роль в app_metadata Supabase
      // Это гарантирует, что роль будет в JWT токене для следующих запросов
      try {
        await supabase.auth.admin.updateUserById(userId, {
          app_metadata: {
            role: role,
          },
        });
        this.authDebug(
          `✅ Role synced to app_metadata for user ${userId}: ${role}`,
        );
      } catch (error) {
        this.authError('⚠️ Failed to sync role to app_metadata:', error);
        // Не блокируем обновление, если не удалось синхронизировать метаданные
      }

      return updatedUser;
    } catch (error) {
      throw new Error(`Failed to update user role: ${error.message}`);
    }
  }

  async syncUserFromSupabase(supabaseUserId: string) {
    try {
      // Получаем данные пользователя из Supabase Auth
      const {
        data: { user },
        error,
      } = await supabase.auth.admin.getUserById(supabaseUserId);

      if (error || !user) {
        throw new Error('User not found in Supabase Auth');
      }

      // Используем upsert для избежания ошибок при race conditions
      const newUser = await this.prisma.user.upsert({
        where: { id: user.id },
        update: {
          // Обновляем данные если пользователь уже существует
          email: user.email || '',
          name:
            user.user_metadata?.name || user.user_metadata?.full_name || null,
          phone: user.user_metadata?.phone || null,
        },
        create: {
          id: user.id,
          email: user.email || '',
          name:
            user.user_metadata?.name || user.user_metadata?.full_name || null,
          phone: user.user_metadata?.phone || null,
          role: 'CLIENT', // По умолчанию CLIENT
        },
      });

      return newUser;
    } catch (error) {
      throw new Error(`Failed to sync user: ${error.message}`);
    }
  }

  private async deleteStudioCascade(
    tx: Prisma.TransactionClient,
    studioId: string,
  ) {
    const sessions = await tx.trainingSession.findMany({
      where: { studioId },
      select: { id: true },
    });
    const sessionIds = sessions.map((s: { id: string }) => s.id);

    if (sessionIds.length > 0) {
      const enrollments = await tx.sessionEnrollment.findMany({
        where: { sessionId: { in: sessionIds } },
        select: { id: true },
      });
      const enrollmentIds = enrollments.map((e: { id: string }) => e.id);

      if (enrollmentIds.length > 0) {
        await tx.scheduledPushReminder.deleteMany({
          where: { enrollmentId: { in: enrollmentIds } },
        });
      }

      await tx.scheduledPushReminder.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      await tx.waitlistEntry.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      await tx.sessionEnrollment.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      await tx.trainingSession.deleteMany({
        where: { id: { in: sessionIds } },
      });
    }

    await tx.review.deleteMany({ where: { studioId } });
    await tx.sessionBooking.deleteMany({ where: { studioId } });
    await tx.trainerInvite.deleteMany({ where: { studioId } });

    await tx.$executeRaw`
      DELETE FROM "_TrainerTrainings"
      WHERE "A" IN (SELECT id FROM "Training" WHERE "studioId" = ${studioId})
         OR "B" IN (SELECT id FROM "Trainer" WHERE "studioId" = ${studioId})
    `;

    await tx.trainer.deleteMany({ where: { studioId } });
    await tx.training.deleteMany({ where: { studioId } });
    await tx.subscription.deleteMany({ where: { studioId } });
    await tx.studioClientBlock.deleteMany({ where: { studioId } });
    await tx.studioClient.deleteMany({ where: { studioId } });
    await tx.adminEventLog.deleteMany({ where: { studioId } });

    await tx.$executeRaw`
      UPDATE "User"
      SET "favoriteStudios" = array_remove("favoriteStudios", ${studioId})
      WHERE ${studioId} = ANY("favoriteStudios")
    `;

    await tx.studio.delete({ where: { id: studioId } });
  }

  private async cleanupOwnerStorage(userId: string) {
    const bucket =
      this.configService.get<string>('SUPABASE_STUDIO_PHOTOS_BUCKET') ||
      'studio-photos';
    const prefix = `owners/${userId}`;

    try {
      const { data: files, error } = await supabase.storage
        .from(bucket)
        .list(prefix, { limit: 1000 });

      if (error) {
        this.authWarn(
          `⚠️ Failed to list owner storage for ${userId}:`,
          error.message,
        );
        return;
      }

      if (!files?.length) return;

      const paths = files
        .filter((file) => file.name && !file.name.endsWith('/'))
        .map((file) => `${prefix}/${file.name}`);

      if (paths.length === 0) return;

      const { error: removeError } = await supabase.storage
        .from(bucket)
        .remove(paths);

      if (removeError) {
        this.authWarn(
          `⚠️ Failed to remove owner storage for ${userId}:`,
          removeError.message,
        );
      }
    } catch (error) {
      this.authWarn(
        `⚠️ Owner storage cleanup failed for ${userId}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async deleteUserAccount(userId: string) {
    try {
      this.authDebug(`🗑️ Starting account deletion for user: ${userId}`);

      // Получаем информацию о пользователе
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          Studio: true,
          Booking: true,
          Review: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      this.authDebug(`📊 User data to delete:`, {
        userId: user.id,
        email: user.email,
        role: user.role,
        studiosCount: user.Studio?.length ?? 0,
        bookingsCount: user.Booking.length,
        reviewsCount: user.Review.length,
      });

      await this.prisma.$transaction(async (tx: any) => {
        for (const studio of user.Studio ?? []) {
          this.authDebug(`🏢 Deleting studio data: ${studio.id}`);
          await this.deleteStudioCascade(tx, studio.id);
        }

        await tx.sessionEnrollment.deleteMany({ where: { userId } });
        await tx.waitlistEntry.deleteMany({ where: { userId } });
        await tx.sessionBooking.deleteMany({ where: { userId } });
        await tx.review.deleteMany({ where: { userId } });
        await tx.studioClient.deleteMany({ where: { userId } });
        await tx.studioClientBlock.deleteMany({ where: { userId } });
        await tx.clientRegistrationOtp.deleteMany({
          where: { email: user.email },
        });

        this.authDebug(`👤 Deleting user: ${userId}`);
        await tx.user.delete({ where: { id: userId } });
      });

      await this.cleanupOwnerStorage(userId);

      try {
        this.authDebug(`🔐 Deleting user from Supabase Auth: ${userId}`);
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) {
          this.authWarn(
            '⚠️ Failed to delete user from Supabase Auth:',
            error.message,
          );
        }
      } catch (supabaseError) {
        this.authWarn(
          '⚠️ Supabase Auth deletion failed:',
          supabaseError instanceof Error
            ? supabaseError.message
            : String(supabaseError),
        );
      }

      this.authDebug(`✅ Account deletion completed for user: ${userId}`);

      return {
        userId,
        email: user.email,
        role: user.role,
        deletedStudios: (user.Studio ?? []).map((s: { id: string }) => s.id),
        deletedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.authError(
        `❌ Account deletion failed for user ${userId}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `Failed to delete account: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getFavoriteStudios(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { favoriteStudios: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Критично: Используем select вместо include для уменьшения payload
      const studios = await this.prisma.Studio.findMany({
        where: {
          id: {
            in: user.favoriteStudios,
          },
        },
        select: {
          id: true,
          name: true,
          description: true,
          address: true,
          phone: true,
          email: true,
          website: true,
          instagram: true,
          photos: true,
          photoGallery: true,
          // Убираем workingHours, reminderSettings, ownerId, createdAt, categoryIds, latitude, longitude - не нужны для списка
          Training: {
            select: {
              id: true,
              name: true,
              price: true,
              duration: true,
              trainingCategoryId: true,
              trainingCategory: {
                select: {
                  id: true,
                  name_en: true,
                  name_vn: true,
                  name_ru: true,
                },
              },
            },
          },
          Review: {
            select: {
              id: true,
              rating: true,
              // Убираем comment, createdAt - не нужны для расчета рейтинга
            },
          },
        },
      });

      const studioIds = studios.map((s: { id: string }) => s.id);
      const categoriesByStudio = new Map<string, string[]>();
      const categoryIdsByStudio = new Map<string, number[]>();

      if (studioIds.length > 0) {
        const categoryData = await this.prisma.training.findMany({
          where: {
            studioId: { in: studioIds },
            trainingCategoryId: { not: null },
          },
          select: {
            studioId: true,
            trainingCategoryId: true,
            trainingCategory: {
              select: {
                name_en: true,
                name_vn: true,
                name_ru: true,
              },
            },
          },
          distinct: ['studioId', 'trainingCategoryId'],
        });

        type Pair = { id: number; label: string };
        const pairMap = new Map<string, Pair[]>();
        for (const item of categoryData) {
          if (!item.trainingCategoryId || !item.trainingCategory) continue;
          const tc = item.trainingCategory;
          const label =
            tc.name_en?.trim() ||
            tc.name_ru?.trim() ||
            tc.name_vn?.trim() ||
            '';
          if (!label) continue;
          const list = pairMap.get(item.studioId) ?? [];
          list.push({ id: item.trainingCategoryId, label });
          pairMap.set(item.studioId, list);
        }
        for (const [sid, pairs] of pairMap) {
          pairs.sort((a, b) => a.id - b.id);
          categoriesByStudio.set(
            sid,
            pairs.map((p) => p.label),
          );
          categoryIdsByStudio.set(
            sid,
            pairs.map((p) => p.id),
          );
        }
      }

      // Calculate average rating for each studio
      const studiosWithRating = studios.map((studio) => {
        const avgRating =
          studio.Review.length > 0
            ? studio.Review.reduce((sum, review) => sum + review.rating, 0) /
              studio.Review.length
            : 0;

        return {
          ...studio,
          averageRating: avgRating,
          avgRating,
          reviewCount: studio.Review.length,
          categories: categoriesByStudio.get(studio.id) ?? [],
          trainingCategoryIds: categoryIdsByStudio.get(studio.id) ?? [],
        };
      });

      return studiosWithRating;
    } catch (error) {
      throw new Error(`Failed to get favorite studios: ${error.message}`);
    }
  }

  async addFavoriteStudio(userId: string, studioId: string) {
    try {
      // Check if studio exists
      const studio = await this.prisma.Studio.findUnique({
        where: { id: studioId },
      });

      if (!studio) {
        throw new Error('Studio not found');
      }

      // Get current user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { favoriteStudios: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Idempotent behavior for MVP UX:
      // if studio is already in favorites, do not fail with 400.
      if (user.favoriteStudios.includes(studioId)) {
        return user;
      }

      // Add studio to favorites
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          favoriteStudios: {
            push: studioId,
          },
        },
      });

      return updatedUser;
    } catch (error) {
      throw new Error(`Failed to add studio to favorites: ${error.message}`);
    }
  }

  async removeFavoriteStudio(userId: string, studioId: string) {
    try {
      // Get current user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { favoriteStudios: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Remove studio from favorites
      const updatedFavorites = user.favoriteStudios.filter(
        (id) => id !== studioId,
      );

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          favoriteStudios: updatedFavorites,
        },
      });

      return updatedUser;
    } catch (error) {
      throw new Error(
        `Failed to remove studio from favorites: ${error.message}`,
      );
    }
  }
}
