import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export enum AssetStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  RETIRED = 'retired',
}

export enum AssetCondition {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Index()
  @Column()
  category: string;

  @Index()
  @Column({ nullable: true })
  serialNumber?: string;

  @Index()
  @Column({ type: 'enum', enum: AssetStatus, default: AssetStatus.ACTIVE })
  status: AssetStatus;

  @Column({ type: 'enum', enum: AssetCondition, default: AssetCondition.GOOD })
  condition: AssetCondition;

  @Column({ type: 'date', nullable: true })
  purchaseDate?: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  purchaseValue?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  currentValue?: number;

  @Column({ nullable: true })
  assignedToUserId?: string;

  @Column({ nullable: true })
  departmentId?: string;

  @Column({ nullable: true })
  locationId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
