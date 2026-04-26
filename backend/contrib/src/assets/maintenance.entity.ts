import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MaintenanceType, MaintenanceStatus } from './enums';

@Entity('maintenance')
export class Maintenance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assetId: string;

  @Column({ type: 'enum', enum: MaintenanceType })
  type: MaintenanceType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ nullable: true })
  scheduledDate: Date | null;

  @Column({ nullable: true })
  completedDate: Date | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  cost: number | null;

  @Column({ nullable: true })
  performedBy: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'enum', enum: MaintenanceStatus, default: MaintenanceStatus.SCHEDULED })
  status: MaintenanceStatus;

  @CreateDateColumn()
  createdAt: Date;
}
