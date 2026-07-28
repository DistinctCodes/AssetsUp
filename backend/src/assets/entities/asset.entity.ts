import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

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

  @Column({ nullable: true })
  assignedToUserId?: string;

  @Column({ nullable: true })
  branchId?: string;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
