import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { AssetStatus } from './enums';

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  assetId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  serialNumber: string | null;

  @Column({ nullable: true })
  manufacturer: string | null;

  @Column({ nullable: true })
  model: string | null;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ nullable: true })
  departmentId: string | null;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[] | null;

  @Column({ type: 'enum', enum: AssetStatus, default: AssetStatus.ACTIVE })
  status: AssetStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null;
}
