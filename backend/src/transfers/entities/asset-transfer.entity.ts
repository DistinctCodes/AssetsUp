import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TransferStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('asset_transfers')
export class AssetTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assetId: string;

  @Column()
  fromDepartmentId: string;

  @Column()
  toDepartmentId: string;

  @Column()
  requestedByUserId: string;

  @Column({ nullable: true })
  approvedByUserId?: string;

  @Column({ type: 'enum', enum: TransferStatus, default: TransferStatus.PENDING })
  status: TransferStatus;

  @Column({ nullable: true })
  rejectionReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
