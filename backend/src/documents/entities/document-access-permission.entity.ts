import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Document } from './document.entity';
import { User } from '../../users/entities/user.entity';

export enum DocumentPermissionType {
  VIEW = 'view',
  DOWNLOAD = 'download',
  EDIT = 'edit',
  DELETE = 'delete',
  SHARE = 'share',
}

@Entity('document_access_permissions')
@Unique(['documentId', 'userId'])
@Index(['documentId'])
@Index(['userId'])
export class DocumentAccessPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Document, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column()
  documentId: string;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column('simple-array', { default: 'view,download' })
  permissions: DocumentPermissionType[];

  @Column({ nullable: true })
  grantedBy: string;

  @CreateDateColumn()
  grantedAt: Date;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
