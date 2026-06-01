import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Asset } from '../../assets/entities/asset.entity';

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  EMERGENCY = 'EMERGENCY',
  INSPECTION = 'INSPECTION',
}

@Entity('maintenance_records')
export class MaintenanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'asset_id' })
  assetId: string;

  @ManyToOne(() => Asset, { onDelete: 'CASCADE' })
  asset: Asset;

  @Column({ type: 'enum', enum: MaintenanceType })
  type: MaintenanceType;

  @Index()
  @Column({ name: 'scheduled_date', type: 'timestamptz' })
  scheduledDate: Date;

  @Column({ name: 'completed_date', type: 'timestamptz', nullable: true })
  completedDate: Date | null;

  @Column({ nullable: true })
  provider: string;

  @Column({ nullable: true })
  technician: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'condition_before', nullable: true })
  conditionBefore: string | null;

  @Column({ name: 'condition_after', nullable: true })
  conditionAfter: string | null;

  @Column({ name: 'stellar_tx_hash', nullable: true })
  stellarTxHash: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

export interface MaintenanceAlert {
  assetId: string;
  message: string;
  scheduledDate: Date;
  type: MaintenanceType;
}