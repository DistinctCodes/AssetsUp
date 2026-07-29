import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AssetHistoryAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  TRANSFERRED = 'TRANSFERRED',
  MAINTENANCE = 'MAINTENANCE',
  NOTE_ADDED = 'NOTE_ADDED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
}

@Entity('asset_history_events')
export class AssetHistoryEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  assetId: string;

  @Column({ type: 'enum', enum: AssetHistoryAction })
  action: AssetHistoryAction;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  previousValue?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  newValue?: Record<string, unknown> | null;

  @Column({ nullable: true })
  performedById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performedById' })
  performedBy?: User | null;

  @CreateDateColumn()
  createdAt: Date;
}
