import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Asset } from './asset.entity';
import { User } from '../../users/entities/user.entity';

@Entity('asset_documents')
export class AssetDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assetId: string;

  @ManyToOne(() => Asset, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assetId' })
  asset: Asset;

  @Column()
  name: string;

  @Column()
  type: string;

  @Column()
  url: string;

  @Column({ nullable: true })
  s3Key: string;

  @Column({ type: 'int', nullable: true })
  size: number;

  @Column({ nullable: true })
  uploadedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
