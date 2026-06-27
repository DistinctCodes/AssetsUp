import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  poNumber: string;

  @Column()
  vendor: string;

  @Column({ nullable: true, type: 'jsonb' })
  items: { name: string; quantity: number; unitPrice: number; total: number }[];

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ default: 'PENDING' })
  status: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ type: 'date', nullable: true })
  orderDate: string;

  @Column({ type: 'date', nullable: true })
  expectedDelivery: string;

  @Column({ nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  approvedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedById' })
  approvedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
