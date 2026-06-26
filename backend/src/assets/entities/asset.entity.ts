import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  assetId: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true })
  categoryId: string;

  @Column({ nullable: true })
  serialNumber: string;

  @Column({ default: 'ACTIVE' })
  status: string;

  @Column({ default: 'NEW' })
  condition: string;

  @Column({ nullable: true })
  departmentId: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  assignedToId: string;

  @Column({ nullable: true })
  barcode: string;

  @Column({ nullable: true })
  qrCode: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  updatedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedById' })
  updatedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
