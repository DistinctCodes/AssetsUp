import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Document } from './document.entity';
import { User } from '../../users/entities/user.entity';

@Entity('document_versions')
@Index(['documentId', 'version'])
@Index(['createdBy'])
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Document, (document) => document.versions, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column()
  documentId: string;

  @Column()
  version: number;

  @Column()
  fileName: string;

  @Column()
  filePath: string;

  @Column()
  fileSize: number;

  @Column()
  mimeType: string;

  @Column({ type: 'text', nullable: true })
  changeLog: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'uploadedBy' })
  uploadedByUser: User;

  @Column()
  uploadedBy: string;

  @CreateDateColumn()
  uploadedAt: Date;

  @Column({ type: 'text', nullable: true })
  checksum: string;

  @Column({ type: 'json', default: '{}' })
  metadata: Record<string, any>;
}
