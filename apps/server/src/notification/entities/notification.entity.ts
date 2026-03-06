import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum NotificationType {
  CARD_ASSIGNED = 'card_assigned',
  CARD_DUE_SOON = 'card_due_soon',
  MEETING_PARSED = 'meeting_parsed',
}

export enum RelatedEntityType {
  CARD = 'card',
  MEETING = 'meeting',
  PROJECT = 'project',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: RelatedEntityType, nullable: true })
  relatedEntityType: RelatedEntityType;

  @Column({ nullable: true })
  relatedEntityId: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
