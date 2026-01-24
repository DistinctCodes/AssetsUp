import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DocumentVersion } from './document-version.entity';

export enum DocumentType {
  INVOICE = 'invoice',
  WARRANTY = 'warranty',
  MANUAL = 'manual',
  PHOTO = 'photo',
  RECEIPT = 'receipt',
  CERTIFICATE = 'certificate',
  MAINTENANCE = 'maintenance',
  LICENSE = 'license',
  OTHER = 'other',
}

export enum DocumentAccessLevel {
  PRIVATE = 'private',
  DEPARTMENT = 'department',
  ORGANIZATION = 'organization',
  PUBLIC = 'public',
}

@Entity('documents')
@Index(['assetId', 'documentType'])
@Index(['createdBy'])
@Index(['accessLevel'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assetId: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
  })
  documentType: DocumentType;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  fileName: string;

  @Column()
  mimeType: string;

  @Column()
  fileSize: number;

  @Column()
  filePath: string;

  @Column({
    type: 'enum',
    enum: DocumentAccessLevel,
    default: DocumentAccessLevel.ORGANIZATION,
  })
  accessLevel: DocumentAccessLevel;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 1 })
  currentVersion: number;

  @Column({ type: 'text', nullable: true })
  tags: string;

  @Column({ nullable: true })
  expirationDate: Date;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'createdBy' })
  createdByUser: User;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updatedByUser: User;

  @Column({ nullable: true })
  updatedBy: string;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => DocumentVersion, (version) => version.document, {
    cascade: true,
    eager: false,
  })
  versions: DocumentVersion[];

  @Column({ type: 'json', default: '{}' })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  checksum: string;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ nullable: true })
  archivedAt: Date;
}
