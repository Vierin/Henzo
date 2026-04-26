import { Module } from '@nestjs/common';
import { StudiosController } from './studios.controller';
import { StudiosService } from './studios.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MapboxModule } from '../mapbox/mapbox.module';
import { TrainingsModule } from '../trainings/trainings.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MapboxModule,
    TrainingsModule,
    CacheModule,
  ],
  controllers: [StudiosController],
  providers: [StudiosService],
  exports: [StudiosService],
})
export class StudiosModule {}
