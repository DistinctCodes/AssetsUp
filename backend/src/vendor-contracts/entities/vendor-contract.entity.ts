import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'vendor_contracts' })
export class VendorContract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Could be a FK to suppliers table (uuid). Keep simple as UUID.
  @Column({ type: 'uuid' })
  @Index()
  supplierId: string;

  @Column({ type: 'varchar', length: 255 })
  contractName: string;

  @Column({ type: 'date' })
  startDate: string; // ISO date string

  @Column({ type: 'date' })
  @Index()
  endDate: string; // ISO date string

  @Column({ type: 'text', nullable: true })
  fileUrl?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
