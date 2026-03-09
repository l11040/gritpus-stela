import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum WeeklyWorkEntryType {
  PLAN = 'plan',
  REPORT = 'report',
}

export enum WeeklyWorkInputType {
  CHAT = 'chat',
  VOICE = 'voice',
}

@Entity('weekly_work_histories')
@Index('UQ_weekly_work_histories_user_week_type', ['userId', 'weekStartDate', 'type'], {
  unique: true,
})
export class WeeklyWorkHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: WeeklyWorkEntryType,
  })
  type: WeeklyWorkEntryType;

  @Column({ type: 'date' })
  weekStartDate: string;

  @Column({
    type: 'enum',
    enum: WeeklyWorkInputType,
  })
  inputType: WeeklyWorkInputType;

  @Column({ type: 'longtext' })
  sourceText: string;

  @Column({ type: 'longtext' })
  markdown: string;

  @ManyToOne(() => WeeklyWorkHistory, { nullable: true, onDelete: 'SET NULL' })
  planReference?: WeeklyWorkHistory | null;

  @Column({ nullable: true })
  planReferenceId?: string | null;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
