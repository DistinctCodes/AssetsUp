import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

@Entity('users')
export class User {
  @ApiProperty({ description: 'User UUID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  @Index({ unique: true })
  @Column()
  email: string;

  @Column()
  @Exclude({ toPlainOnly: true })
  passwordHash: string;

  @ApiProperty({ example: 'John' })
  @Column()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Column()
  lastName: string;

  @ApiProperty({ enum: UserRole })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.EMPLOYEE })
  role: UserRole;

  @Column({ nullable: true })
  departmentId?: string;

  @Column({ nullable: true })
  branchId?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'text', nullable: true })
  @Exclude({ toPlainOnly: true })
  refreshTokenHash?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
