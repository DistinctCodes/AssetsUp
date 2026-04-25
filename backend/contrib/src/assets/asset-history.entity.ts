import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { AssetHistoryAction } from './enums';

@Entity('asset_history')
export class AssetHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ nullable: true })
  performedById: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
