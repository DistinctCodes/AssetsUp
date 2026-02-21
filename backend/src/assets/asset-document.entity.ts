import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('asset_documents')
export class AssetDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assetId: string;

  @Column()
  name: string;

  @Column()
  url: string;

  @Column({ default: 'application/octet-stream' })
  type: string;

  @Column({ nullable: true })
  size: number | null;

  @ManyToOne(() => User, { eager: true })
  uploadedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
