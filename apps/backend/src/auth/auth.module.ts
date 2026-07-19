import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtVerifierService } from './jwt-verifier.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MetricsSecretGuard } from './metrics-secret.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { AdminEventLogModule } from '../admin/admin-event-log.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    ConfigModule,
    AdminEventLogModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtVerifierService,
    JwtAuthGuard,
    MetricsSecretGuard,
  ],
  exports: [AuthService, JwtAuthGuard, MetricsSecretGuard],
})
export class AuthModule {}
