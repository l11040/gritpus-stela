import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Card } from '../board/entities/card.entity';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationCronService {
  private readonly logger = new Logger(NotificationCronService.name);

  constructor(
    @InjectRepository(Card)
    private readonly cardRepo: Repository<Card>,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkDueSoonCards(): Promise<void> {
    this.logger.log('카드 기한 임박 알림 체크 시작');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    const dueSoonCards = await this.cardRepo
      .createQueryBuilder('card')
      .leftJoinAndSelect('card.assignees', 'assignees')
      .where('card.dueDate > :today', { today })
      .andWhere('card.dueDate <= :threeDaysLater', { threeDaysLater })
      .getMany();

    this.logger.log(`기한 임박 카드 ${dueSoonCards.length}개 발견`);

    for (const card of dueSoonCards) {
      if (!card.assignees || card.assignees.length === 0) continue;

      const assigneeIds = card.assignees.map((a) => a.id);
      await this.notificationService.notifyCardDueSoon(
        card.id,
        card.title,
        card.dueDate,
        assigneeIds,
      );
    }

    this.logger.log('카드 기한 임박 알림 체크 완료');
  }
}
