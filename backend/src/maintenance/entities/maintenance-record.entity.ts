import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  SCHEDULED = 'SCHEDULED',
}

@Entity('maintenance_records')
export class MaintenanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assetId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: MaintenanceType,
    default: MaintenanceType.SCHEDULED,
  })
  type: MaintenanceType;

  @Column({
    type: 'enum',
    enum: MaintenanceStatus,
    default: MaintenanceStatus.SCHEDULED,
  })
  status: MaintenanceStatus;

  @Column({ nullable: true })
  vendorId?: string;

  @Column({ nullable: true })
  performedByUserId?: string;

  @Column({ type: 'integer', default: 0 })
  cost: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ nullable: true })
  scheduledDate?: Date;

  @Column({ nullable: true })
  completedDate?: Date;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
