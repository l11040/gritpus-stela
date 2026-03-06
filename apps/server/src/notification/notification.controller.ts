import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Sse,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { NotificationService } from './notification.service';
import { NotificationStreamService } from './notification-stream.service';
import { NotificationQueryDto } from './notification.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import {
  GetNotificationsDocs,
  GetUnreadCountDocs,
  MarkAsReadDocs,
  MarkAllAsReadDocs,
  DeleteNotificationDocs,
  DeleteAllNotificationsDocs,
  NotificationStreamDocs,
} from './notification.swagger';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly streamService: NotificationStreamService,
  ) {}

  @Get()
  @GetNotificationsDocs()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationService.findByUser(user.id, query);
  }

  @Get('unread-count')
  @GetUnreadCountDocs()
  async getUnreadCount(@CurrentUser() user: CurrentUserPayload) {
    const count = await this.notificationService.getUnreadCount(user.id);
    return { count };
  }

  @Post(':id/read')
  @MarkAsReadDocs()
  markAsRead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.notificationService.markAsRead(user.id, id);
  }

  @Post('read-all')
  @MarkAllAsReadDocs()
  markAllAsRead(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @DeleteNotificationDocs()
  deleteNotification(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.notificationService.deleteNotification(user.id, id);
  }

  @Delete()
  @DeleteAllNotificationsDocs()
  deleteAll(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationService.deleteAll(user.id);
  }

  @Sse('stream')
  @NotificationStreamDocs()
  stream(@CurrentUser() user: CurrentUserPayload): Observable<MessageEvent> {
    return this.streamService.subscribe(user.id);
  }
}
