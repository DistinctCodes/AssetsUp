import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Asset } from '../assets/asset.entity';

export enum BorrowStatus {
  BORROWED = 'borrowed',
  RETURNED = 'returned',
  OVERDUE = 'overdue',
}

@Entity('borrowings')
export class Borrowing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Asset, { eager: true, nullable: false })
  @JoinColumn({ name: 'assetId' })
  asset: Asset;

  @Column()
  assetId: string;

  @ManyToOne(() => User, { eager: true, nullable: false })
  @JoinColumn({ name: 'borrowedById' })
  borrowedBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedById' })
  approvedBy: User | null;

  @Column({ type: 'enum', enum: BorrowStatus, default: BorrowStatus.BORROWED })
  status: BorrowStatus;

  @Column({ type: 'timestamp' })
  dueDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  returnedAt: Date | null;

  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  @CreateDateColumn()
  checkedOutAt: Date;
}
