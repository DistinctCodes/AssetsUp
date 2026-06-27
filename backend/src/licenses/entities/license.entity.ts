import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('licenses')
export class License {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  licenseKey: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  softwareName: string;

  @Column({ nullable: true })
  vendor: string;

  @Column({ type: 'int', nullable: true })
  totalSeats: number;

  @Column({ type: 'int', default: 0 })
  usedSeats: number;

  @Column({ type: 'date', nullable: true })
  purchaseDate: string;

  @Column({ type: 'date', nullable: true })
  expiryDate: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost: number;

  @Column({ default: 'ACTIVE' })
  status: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ nullable: true })
  assignedToId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User;

  @Column({ nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
