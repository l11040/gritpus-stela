import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationStreamService } from './notification-stream.service';
import { NotificationCronService } from './notification-cron.service';
import { Notification } from './entities/notification.entity';
import { Card } from '../board/entities/card.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, Card]),
    ScheduleModule.forRoot(),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationStreamService,
    NotificationCronService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
