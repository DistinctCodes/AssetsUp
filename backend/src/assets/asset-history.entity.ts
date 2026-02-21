import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Asset } from './asset.entity';
import { User } from '../users/user.entity';
import { AssetHistoryAction } from './enums';

@Entity('asset_history')
export class AssetHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Asset, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assetId' })
  asset: Asset;

  @Column()
  assetId: string;

  @Column({ type: 'enum', enum: AssetHistoryAction })
  action: AssetHistoryAction;

  @Column()
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  previousValue: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  newValue: Record<string, unknown> | null;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'performedById' })
  performedBy: User | null;

  @CreateDateColumn()
  createdAt: Date;
}
