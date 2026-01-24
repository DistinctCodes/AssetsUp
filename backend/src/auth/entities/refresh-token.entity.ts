import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { IsString, IsDate, IsOptional } from 'class-validator';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.refreshTokens, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ unique: true })
  @IsString()
  token: string;

  @Column()
  @IsDate()
  expiresAt: Date;

  @Column()
  @IsString()
  createdByIp: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsDate()
  revokedAt?: Date;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  revokedByIp?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  replacedByToken?: string;

  @CreateDateColumn()
  createdAt: Date;
}