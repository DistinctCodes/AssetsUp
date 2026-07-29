import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('asset_documents')
export class AssetDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assetId: string;

  @Column()
  title: string;

  @Column()
  fileUrl: string;

  @Column({ nullable: true })
  fileType?: string;

  @Column({ type: 'integer', default: 0 })
  fileSizeBytes: number;

  @Column()
  uploadedByUserId: string;

  @CreateDateColumn()
  createdAt: Date;
}
