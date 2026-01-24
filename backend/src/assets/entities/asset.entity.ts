import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { AssetCategory } from '../../asset-categories/asset-category.entity';
import { Department } from '../../departments/department.entity';
import { Location } from '../../locations/location.entity';
import { User } from '../../users/entities/user.entity';

export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  ASSIGNED = 'ASSIGNED',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED',
}

export enum AssetCondition {
  NEW = 'NEW',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  DAMAGED = 'DAMAGED',
}

@Entity('assets')
@Index(['assetId'], { unique: true })
@Index(['serialNumber'], { unique: true, where: 'serial_number IS NOT NULL' })
@Index(['status'])
@Index(['category'])
@Index(['department'])
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'asset_id', length: 50, unique: true })
  assetId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => AssetCategory, { eager: true })
  @JoinColumn({ name: 'category_id' })
  category: AssetCategory;

  @Column({ name: 'serial_number', length: 100, unique: true, nullable: true })
  serialNumber: string;

  @Column({ name: 'purchase_date', type: 'date', nullable: true })
  purchaseDate: Date;

  @Column({
    name: 'purchase_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  purchasePrice: number;

  @Column({
    name: 'current_value',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  currentValue: number;

  @Column({ name: 'warranty_expiration', type: 'date', nullable: true })
  warrantyExpiration: Date;

  @Column({
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.ACTIVE,
  })
  status: AssetStatus;

  @Column({
    type: 'enum',
    enum: AssetCondition,
    default: AssetCondition.GOOD,
  })
  condition: AssetCondition;

  @ManyToOne(() => Department, { eager: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @ManyToOne(() => Location, { eager: true, nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User;

  @Column({ name: 'image_urls', type: 'simple-array', nullable: true })
  imageUrls: string[];

  @Column({ name: 'custom_fields', type: 'jsonb', nullable: true })
  customFields: Record<string, any>;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ length: 100, nullable: true })
  manufacturer: string;

  @Column({ length: 100, nullable: true })
  model: string;

  @Column({ name: 'barcode', length: 100, nullable: true })
  barcode: string;

  @Column({ name: 'qr_code', length: 100, nullable: true })
  qrCode: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: User;
}