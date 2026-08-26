import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Asset } from '../../assets/entities/asset.entity';
import { User } from '../../users/entities/user.entity';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assetId: string;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'assetId' })
  asset: Asset;

  @Column()
  reservedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reservedByUserId' })
  reservedBy: User;

  @Column({ type: 'timestamp' })
  startsAt: Date;

  @Column({ type: 'timestamp' })
  endsAt: Date;

  @Column({ nullable: true })
  purpose?: string;

  @Column({ default: 'PENDING' })
  status: string; // PENDING | CONFIRMED | CANCELLED | COMPLETED

  @CreateDateColumn()
  createdAt: Date;
}
