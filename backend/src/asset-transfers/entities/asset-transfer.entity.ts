import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Asset } from '../../assets/entities/assest.entity';

export enum TransferStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXECUTED = 'executed',
  SCHEDULED = 'scheduled'
}

export enum TransferType {
  CHANGE_USER = 'change_user',
  CHANGE_DEPARTMENT = 'change_department',
  CHANGE_LOCATION = 'change_location',
  ALL = 'all'
}

@Entity('asset_transfers')
export class AssetTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { array: true })
  assetIds: string[];

  @ManyToOne(() => Asset, { eager: true })
  @JoinColumn({ name: 'assetIds' })
  assets: Asset[];

  @Column({
    type: 'enum',
    enum: TransferType
  })
  transferType: TransferType;

  @Column({ nullable: true })
  sourceUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'sourceUserId' })
  sourceUser: User;

  @Column({ nullable: true })
  destinationUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'destinationUserId' })
  destinationUser: User;

  @Column({ nullable: true })
  sourceDepartmentId: number;

  @Column({ nullable: true })
  destinationDepartmentId: number;

  @Column({ nullable: true })
  sourceLocation: string;

  @Column({ nullable: true })
  destinationLocation: string;

  @Column()
  reason: string;

  @Column({ nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: TransferStatus,
    default: TransferStatus.PENDING
  })
  status: TransferStatus;

  @Column({ default: false })
  approvalRequired: boolean;

  @Column({ type: 'timestamp', nullable: true })
  scheduledDate: Date;

  @Column()
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column({ nullable: true })
  approvedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedById' })
  approvedBy: User;

  @Column({ nullable: true })
  rejectionReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}