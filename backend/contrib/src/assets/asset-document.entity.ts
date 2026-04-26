import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('asset_document')
export class AssetDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assetId: string;

  @Column()
  name: string;

  @Column()
  url: string;

  @Column()
  type: string;

  @Column({ type: 'bigint' })
  size: number;

  @ManyToOne(() => User, { eager: true })
  uploadedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
