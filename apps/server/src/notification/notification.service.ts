import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType, RelatedEntityType } from './entities/notification.entity';
import { NotificationStreamService } from './notification-stream.service';
import {
  NotificationResponseDto,
  NotificationListResponseDto,
  NotificationQueryDto,
} from './notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly streamService: NotificationStreamService,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    relatedEntityType?: RelatedEntityType,
    relatedEntityId?: string,
  ): Promise<Notification> {
    const notification = this.notificationRepo.create({
      userId,
      type,
      title,
      message,
      relatedEntityType,
      relatedEntityId,
    });

    const saved = await this.notificationRepo.save(notification);

    // SSE로 실시간 전송
    this.streamService.emit(userId, this.toDto(saved));

    return saved;
  }

  async findByUser(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<NotificationListResponseDto> {
    const { page = 1, limit = 20, type, isRead } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.notificationRepo
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    if (isRead !== undefined) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead });
    }

    const [notifications, total] = await queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      notifications: notifications.map((n) => this.toDto(n)),
      total,
      page,
      limit,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('알림을 찾을 수 없습니다');
    }

    notification.isRead = true;
    await this.notificationRepo.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('알림을 찾을 수 없습니다');
    }

    await this.notificationRepo.remove(notification);
  }

  async deleteAll(userId: string): Promise<void> {
    await this.notificationRepo.delete({ userId });
  }

  // 헬퍼 메서드: 카드 할당 알림
  async notifyCardAssigned(
    cardId: string,
    cardTitle: string,
    assigneeIds: string[],
  ): Promise<void> {
    for (const userId of assigneeIds) {
      await this.create(
        userId,
        NotificationType.CARD_ASSIGNED,
        '새로운 카드가 할당되었습니다',
        `"${cardTitle}" 카드가 회원님에게 할당되었습니다.`,
        RelatedEntityType.CARD,
        cardId,
      );
    }
  }

  // 헬퍼 메서드: 회의록 파싱 완료 알림
  async notifyMeetingParsed(
    meetingId: string,
    meetingTitle: string,
    userId: string,
  ): Promise<void> {
    await this.create(
      userId,
      NotificationType.MEETING_PARSED,
      '회의록 파싱이 완료되었습니다',
      `"${meetingTitle}" 회의록의 파싱이 완료되었습니다.`,
      RelatedEntityType.MEETING,
      meetingId,
    );
  }

  // 헬퍼 메서드: 카드 기한 임박 알림
  async notifyCardDueSoon(
    cardId: string,
    cardTitle: string,
    dueDate: Date,
    assigneeIds: string[],
  ): Promise<void> {
    const dueDateStr = dueDate.toLocaleDateString('ko-KR');
    for (const userId of assigneeIds) {
      await this.create(
        userId,
        NotificationType.CARD_DUE_SOON,
        '카드 마감일이 임박했습니다',
        `"${cardTitle}" 카드의 마감일(${dueDateStr})이 3일 이내입니다.`,
        RelatedEntityType.CARD,
        cardId,
      );
    }
  }

  private toDto(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };
  }
}
