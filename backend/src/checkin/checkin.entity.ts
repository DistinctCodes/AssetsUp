import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity('checkin_records')
export class CheckinRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assetId: string;

  @Column({ nullable: true })
  assignedToId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User;

  @Column({ nullable: true })
  checkedOutById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'checkedOutById' })
  checkedOutBy: User;

  @Column({ nullable: true })
  checkedInById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'checkedInById' })
  checkedInBy: User;

  @Column({ type: 'timestamp' })
  checkedOutAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  checkedInAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ default: 'CHECKED_OUT' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
