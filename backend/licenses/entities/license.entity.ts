import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('licenses')
export class License {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assetId: string; // The ID of the asset this license belongs to

  @Column()
  licenseType: string; // e.g., "Vehicle Registration", "Software License"

  @Column({ type: 'date' })
  expiryDate: Date;

  @Column()
  documentUrl: string; // URL to the stored document (e.g., in S3)
  
  @Column({ default: false })
  isExpiryNotified: boolean; // Flag to prevent sending repeated alerts

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}