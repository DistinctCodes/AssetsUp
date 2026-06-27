import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  assetId: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true })
  categoryId: string;

  @Column({ nullable: true })
  serialNumber: string;

  @Column({ nullable: true, type: 'date' })
  purchaseDate: string;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  purchasePrice: number;

  @Column({ nullable: true, type: 'decimal', precision: 12, scale: 2 })
  currentValue: number;

  @Column({ nullable: true, type: 'date' })
  warrantyExpiration: string;

  @Column({ default: 'ACTIVE' })
  status: string;

  @Column({ default: 'NEW' })
  condition: string;

  @Column({ nullable: true })
  departmentId: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  building: string;

  @Column({ nullable: true })
  room: string;

  @Column({ nullable: true })
  aisle: string;

  @Column({ nullable: true })
  shelf: string;

  @Column({ nullable: true })
  assignedToId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User;

  @Column({ nullable: true, type: 'jsonb' })
  imageUrls: string[];

  @Column({ nullable: true, type: 'jsonb' })
  customFields: Record<string, unknown>;

  @Column({ nullable: true, type: 'jsonb' })
  tags: string[];

  @Column({ nullable: true })
  manufacturer: string;

  @Column({ nullable: true })
  model: string;

  @Column({ nullable: true })
  barcode: string;

  @Column({ nullable: true })
  qrCode: string;

  @Column({ type: 'date', nullable: true })
  endOfLife: string;

  @Column({ default: false })
  endOfLifeNotificationSent: boolean;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  updatedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedById' })
  updatedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
