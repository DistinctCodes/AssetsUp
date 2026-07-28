import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum POStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  poNumber: string;

  @Column({ nullable: true })
  vendorId?: string;

  @Column({ type: 'enum', enum: POStatus, default: POStatus.DRAFT })
  status: POStatus;

  @Column({ type: 'integer', default: 0 })
  totalAmount: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ nullable: true })
  createdByUserId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
