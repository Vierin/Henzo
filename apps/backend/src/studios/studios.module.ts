import { Module } from '@nestjs/common';
import { StudiosController } from './studios.controller';
import { StudiosService } from './studios.service';
import { StudioClaimService } from './studio-claim.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MapboxModule } from '../mapbox/mapbox.module';
import { TrainingsModule } from '../trainings/trainings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MapboxModule,
    TrainingsModule,
    NotificationsModule,
    EmailModule,
  ],
  controllers: [StudiosController],
  providers: [StudiosService, StudioClaimService],
  exports: [StudiosService, StudioClaimService],
})
export class StudiosModule {}
