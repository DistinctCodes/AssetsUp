// src/transfers/entities/transfer.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Asset } from '../../assets/entities/asset.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
// import { Location } from '../../locations/entities/location.entity';

export enum TransferType {
  USER = 'USER',
  DEPARTMENT = 'DEPARTMENT',
  LOCATION = 'LOCATION',
  COMPLETE = 'COMPLETE',
}

export enum TransferStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('transfers')
@Index(['status'])
@Index(['requestedBy'])
@Index(['scheduledDate'])
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TransferType,
  })
  transferType: TransferType;

  @ManyToMany(() => Asset, { eager: true })
  @JoinTable({
    name: 'transfer_assets',
    joinColumn: { name: 'transfer_id' },
    inverseJoinColumn: { name: 'asset_id' },
  })
  assets: Asset[];

  @ManyToOne(() => User, { nullable: true })
  fromUser: User;

  @ManyToOne(() => User, { nullable: true })
  toUser: User;

  @ManyToOne(() => Department, { nullable: true })
  fromDepartment: Department;

  @ManyToOne(() => Department, { nullable: true })
  toDepartment: Department;

  @ManyToOne(() => Location, { nullable: true })
  fromLocation: Location;

  @ManyToOne(() => Location, { nullable: true })
  toLocation: Location;

  @Column({
    type: 'enum',
    enum: TransferStatus,
    default: TransferStatus.PENDING,
  })
  status: TransferStatus;

  @ManyToOne(() => User)
  requestedBy: User;

  @ManyToOne(() => User, { nullable: true })
  approvedBy: User;

  @ManyToOne(() => User, { nullable: true })
  rejectedBy: User;

  @Column('text')
  reason: string;

  @Column('text', { nullable: true })
  notes: string;

  @Column({ default: false })
  approvalRequired: boolean;

  @Column('text', { nullable: true })
  rejectionReason: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
