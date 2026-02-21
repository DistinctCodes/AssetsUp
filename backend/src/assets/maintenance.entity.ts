import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  SCHEDULED = 'SCHEDULED',
}

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('asset_maintenance')
export class Maintenance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assetId: string;

  @Column({ type: 'enum', enum: MaintenanceType })
  type: MaintenanceType;

  @Column('text')
  description: string;

  @Column({ type: 'date' })
  scheduledDate: Date;

  @Column({ type: 'date', nullable: true })
  completedDate: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost: number | null;

  @ManyToOne(() => User, { eager: true, nullable: true })
  performedBy: User | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'enum', enum: MaintenanceStatus, default: MaintenanceStatus.SCHEDULED })
  status: MaintenanceStatus;

  @CreateDateColumn()
  createdAt: Date;
}
