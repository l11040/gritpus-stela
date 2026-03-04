import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Project } from '../../project/entities/project.entity';
import { BoardColumn } from './column.entity';

@Entity('boards')
export class Board {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 0 })
  position: number;

  @ManyToOne(() => Project, (p) => p.boards, { onDelete: 'CASCADE' })
  project: Project;

  @Column()
  projectId: string;

  @OneToMany(() => BoardColumn, (col) => col.board, { cascade: true })
  columns: BoardColumn[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
