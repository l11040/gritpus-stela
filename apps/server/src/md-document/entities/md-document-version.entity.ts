import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { MdDocument } from './md-document.entity';

@Entity('md_document_versions')
export class MdDocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MdDocument, (d) => d.versions, { onDelete: 'CASCADE' })
  document: MdDocument;

  @Column()
  documentId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'longtext' })
  content: string;

  @Column({ length: 255, nullable: true })
  changeNote: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;
}
