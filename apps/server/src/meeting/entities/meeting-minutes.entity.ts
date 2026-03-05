import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Project } from '../../project/entities/project.entity';
import { Document } from '../../document/entities/document.entity';
import { User } from '../../auth/entities/user.entity';

export enum MeetingMinutesStatus {
  UPLOADED = 'uploaded',
  PARSING = 'parsing',
  PARSED = 'parsed',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

@Entity('meeting_minutes')
export class MeetingMinutes {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'longtext', nullable: true })
  rawContent: string;

  @Column({ type: 'json', nullable: true })
  parsedActionItems: object;

  @Column({ type: 'json', nullable: true })
  meetingSummary: string;

  @Column({
    type: 'enum',
    enum: MeetingMinutesStatus,
    default: MeetingMinutesStatus.UPLOADED,
  })
  status: MeetingMinutesStatus;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project: Project;

  @Column()
  projectId: string;

  @ManyToOne(() => Document, { nullable: true, onDelete: 'SET NULL' })
  document: Document;

  @Column({ nullable: true })
  documentId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
