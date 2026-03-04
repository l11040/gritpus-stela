import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ProjectMember } from './project-member.entity';
import { Board } from '../../board/entities/board.entity';
import { Document } from '../../document/entities/document.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ProjectMember, (pm) => pm.project)
  members: ProjectMember[];

  @OneToMany(() => Board, (b) => b.project)
  boards: Board[];

  @OneToMany(() => Document, (d) => d.project)
  documents: Document[];
}
