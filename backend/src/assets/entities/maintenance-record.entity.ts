import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Asset } from './asset.entity';
import { User } from '../../users/entities/user.entity';

@Entity('maintenance_records')
export class MaintenanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assetId: string;

  @ManyToOne(() => Asset, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assetId' })
  asset: Asset;

  @Column()
  type: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'date' })
  scheduledDate: string;

  @Column({ type: 'date', nullable: true })
  completedDate: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost: number;

  @Column({ nullable: true })
  performedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'performedById' })
  performedBy: User;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ default: 'SCHEDULED' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
