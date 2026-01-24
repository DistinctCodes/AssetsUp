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

export enum DocumentAuditActionType {
  CREATED = 'created',
  UPDATED = 'updated',
  VERSION_CREATED = 'version_created',
  ACCESSED = 'accessed',
  DOWNLOADED = 'downloaded',
  DELETED = 'deleted',
  ARCHIVED = 'archived',
  UNARCHIVED = 'unarchived',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_UPDATED = 'permission_updated',
  PERMISSION_REVOKED = 'permission_revoked',
  VERSION_RESTORED = 'version_restored',
}

@Entity('document_audit_logs')
@Index(['documentId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['actionType'])
export class DocumentAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Document, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column()
  documentId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: DocumentAuditActionType,
  })
  actionType: DocumentAuditActionType;

  @Column({ type: 'text', nullable: true })
  details: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ type: 'json', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
