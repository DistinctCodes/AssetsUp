import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('asset_notes')
export class AssetNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assetId: string;

  @Column()
  authorUserId: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
