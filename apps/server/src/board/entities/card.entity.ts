import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { BoardColumn } from './column.entity';
import { User } from '../../auth/entities/user.entity';
import { Label } from './label.entity';

export enum CardPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: CardPriority, default: CardPriority.MEDIUM })
  priority: CardPriority;

  @Column({ default: 0 })
  position: number;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @ManyToOne(() => BoardColumn, (col) => col.cards, { onDelete: 'CASCADE' })
  column: BoardColumn;

  @Column()
  columnId: string;

  @ManyToOne(() => User, (u) => u.assignedCards, { nullable: true, onDelete: 'SET NULL' })
  assignee: User;

  @Column({ nullable: true })
  assigneeId: string;

  @ManyToMany(() => Label)
  @JoinTable({ name: 'card_labels' })
  labels: Label[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
