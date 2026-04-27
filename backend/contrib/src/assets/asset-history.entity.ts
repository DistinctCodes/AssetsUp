import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Asset } from './asset.entity';
import { AssetHistoryAction } from './enums';

@Entity('asset_history')
export class AssetHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Asset, (asset) => asset.history, { onDelete: 'CASCADE' })
  asset: Asset;

  @Column()
  action: AssetHistoryAction;

  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, unknown> | null;

  @Column({ nullable: true })
  performedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
