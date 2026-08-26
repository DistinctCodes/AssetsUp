import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Department } from '../../departments/entities/department.entity';
import { Location } from '../../locations/entities/location.entity';
import { User } from '../../users/entities/user.entity';

/** Relations loaded whenever a single asset is returned to the frontend. */
export const ASSET_DETAIL_RELATIONS = [
  'category',
  'department',
  'location',
  'assignedTo',
];

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  assetTag: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  categoryId?: string;

  @Column({ nullable: true })
  departmentId?: string;

  @Column({ nullable: true })
  locationId?: string;

  @Column({ nullable: true, type: 'varchar' })
  assignedToUserId?: string | null;

  @Column({ nullable: true })
  branchId?: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category?: Category | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'departmentId' })
  department?: Department | null;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'locationId' })
  location?: Location | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedToUserId' })
  assignedTo?: User | null;

  @Column({ default: 'AVAILABLE' })
  status: string;

  @Column({ default: 'GOOD' })
  condition: string;

  @Column({ nullable: true })
  serialNumber?: string;

  @Column({ nullable: true })
  model?: string;

  @Column({ nullable: true })
  manufacturer?: string;

  @Column({ nullable: true })
  purchaseDate?: Date;

  @Column({ type: 'integer', default: 0 })
  purchaseCost: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ nullable: true })
  warrantyExpiry?: Date;

  @Column({ nullable: true })
  supplierId?: string;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ default: false })
  isDigital: boolean;

  @Column({ nullable: true })
  depreciationMethod?: string;

  @Column({ nullable: true })
  usefulLifeMonths?: number;

  @Column({ nullable: true })
  salvageValue?: number;

  @Column({ nullable: true, type: 'decimal', precision: 14, scale: 2 })
  currentValue?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
