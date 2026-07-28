import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  @Index()
  assetTag: string; // Used for physical barcode lookups

  @Column({ nullable: true })
  qrCode: string; // S3 Key for QR code PNG

  @Column({ nullable: true })
  barcode: string; // S3 Key for Barcode PNG

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}