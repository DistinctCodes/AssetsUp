import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LicenseType {
  PERPETUAL = 'PERPETUAL',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

export enum BillingPeriod {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  ONE_TIME = 'ONE_TIME',
}

@Entity('software_licenses')
export class License {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  vendorId?: string;

  @Column({ select: false })
  licenseKey: string;

  @Column({
    type: 'enum',
    enum: LicenseType,
    default: LicenseType.SUBSCRIPTION,
  })
  type: LicenseType;

  @Column({ type: 'enum', enum: BillingPeriod, default: BillingPeriod.YEARLY })
  billingPeriod: BillingPeriod;

  @Column({ type: 'integer', default: 1 })
  seatsTotal: number;

  @Column({ type: 'integer', default: 0 })
  seatsUsed: number;

  @Column({ nullable: true })
  startDate?: Date;

  @Column({ nullable: true })
  expiryDate?: Date;

  @Column({ type: 'integer', default: 0 })
  cost: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ default: false })
  autoRenew: boolean;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
