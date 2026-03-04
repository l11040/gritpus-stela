import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Board } from './board.entity';
import { Card } from './card.entity';

@Entity('board_columns')
export class BoardColumn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: 0 })
  position: number;

  @Column({ nullable: true })
  color: string;

  @ManyToOne(() => Board, (b) => b.columns, { onDelete: 'CASCADE' })
  board: Board;

  @Column()
  boardId: string;

  @OneToMany(() => Card, (card) => card.column, { cascade: true })
  cards: Card[];

  @CreateDateColumn()
  createdAt: Date;
}
