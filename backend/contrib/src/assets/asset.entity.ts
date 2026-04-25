import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AssetHistory } from './asset-history.entity';

@Entity('asset')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string | null;

  @Column({ nullable: true, unique: true })
  assetId: string | null;

  @Column({ nullable: true })
  serialNumber: string | null;

  @Column({ nullable: true })
  manufacturer: string | null;

  @Column({ nullable: true })
  model: string | null;

  @Column({ nullable: true })
  categoryId: string | null;

  @Column({ nullable: true })
  departmentId: string | null;

  @Column({ nullable: true })
  location: string | null;

  @Column({ type: 'enum', enum: ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'], nullable: true })
  condition: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  value: number | null;

  @Column({ nullable: true })
  purchaseDate: Date | null;

  @Column({ type: 'enum', enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED'], default: 'ACTIVE' })
  status: string;

  @Column({ nullable: true })
  assignedTo: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  @OneToMany(() => AssetHistory, (history) => history.asset, { cascade: true })
  history: AssetHistory[];
}
