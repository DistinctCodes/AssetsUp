import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

export enum POStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

@Entity('purchase_order_line_items')
export class PurchaseOrderLineItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  purchaseOrderId: string;

  @Column()
  description: string;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({ type: 'integer', default: 0 })
  unitCost: number;

  @Column({ nullable: true })
  category?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
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

  @OneToMany(
    () => PurchaseOrderLineItem,
    (item) => item.purchaseOrderId,
    { cascade: true },
  )
  lineItems?: PurchaseOrderLineItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
