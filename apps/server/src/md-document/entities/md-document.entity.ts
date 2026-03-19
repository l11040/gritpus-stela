import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { MdDocumentVersion } from './md-document-version.entity';

@Entity('md_documents')
export class MdDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'longtext', nullable: true })
  currentContent: string;

  @Column({ type: 'int', default: 1 })
  currentVersion: number;

  @Column({ type: 'tinyint', default: 0 })
  isShared: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  owner: User;

  @Column()
  ownerId: string;

  @Column({ type: 'json', nullable: true })
  summaryJson: object;

  @OneToMany(() => MdDocumentVersion, (v) => v.document)
  versions: MdDocumentVersion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
