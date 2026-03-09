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

@Entity('weekly_work_preferences')
export class WeeklyWorkPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Index('IDX_weekly_work_preferences_userId', { unique: true })
  @Column()
  userId: string;

  @Column({ type: 'longtext', nullable: true })
  planTemplate?: string | null;

  @Column({ type: 'longtext', nullable: true })
  reportTemplate?: string | null;

  @Column({ type: 'json', nullable: true })
  planCases?: string[] | null;

  @Column({ type: 'json', nullable: true })
  reportCases?: string[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
