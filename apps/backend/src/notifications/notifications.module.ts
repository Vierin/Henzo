import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { FirebaseAdminService } from './firebase-admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminEventLogModule } from '../admin/admin-event-log.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule),
    ConfigModule,
    AdminEventLogModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, FirebaseAdminService],
  exports: [NotificationsService, FirebaseAdminService],
})
export class NotificationsModule {}
