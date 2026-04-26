import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('password-reset-token')
@Index('tokenHash_index', ['tokenHash'])
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'userId' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ name: 'tokenHash' })
  tokenHash: string;

  @Column({ name: 'expiresAt' })
  expiresAt: Date;

  @Column({ name: 'usedAt', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
}
