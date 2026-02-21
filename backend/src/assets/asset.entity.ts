import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Department } from '../departments/department.entity';
import { Category } from '../categories/category.entity';
import { AssetStatus, AssetCondition, StellarStatus } from './enums';

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  assetId: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @ManyToOne(() => Category, { eager: true, nullable: false })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ nullable: true })
  serialNumber: string | null;

  @Column({ nullable: true, type: 'date' })
  purchaseDate: Date | null;

  @Column({ nullable: true, type: 'decimal', precision: 15, scale: 2 })
  purchasePrice: number | null;

  @Column({ nullable: true, type: 'decimal', precision: 15, scale: 2 })
  currentValue: number | null;

  @Column({ nullable: true, type: 'date' })
  warrantyExpiration: Date | null;

  @Column({ type: 'enum', enum: AssetStatus, default: AssetStatus.ACTIVE })
  status: AssetStatus;

  @Column({ type: 'enum', enum: AssetCondition, default: AssetCondition.NEW })
  condition: AssetCondition;

  @ManyToOne(() => Department, { eager: true, nullable: false })
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @Column({ nullable: true })
  location: string | null;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User | null;

  @Column({ type: 'simple-array', nullable: true })
  imageUrls: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, unknown> | null;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[] | null;

  @Column({ nullable: true })
  manufacturer: string | null;

  @Column({ nullable: true })
  model: string | null;

  @Column({ nullable: true })
  barcode: string | null;

  @Column({ nullable: true })
  qrCode: string | null;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @Column({ nullable: true })
  stellarAssetId: string | null;

  @Column({ nullable: true })
  stellarTxHash: string | null;

  @Column({ type: 'enum', enum: StellarStatus, default: StellarStatus.NOT_REGISTERED })
  stellarStatus: StellarStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedById' })
  updatedBy: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
