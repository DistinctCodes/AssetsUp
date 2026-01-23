import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { Department } from '../../departments/entities/department.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { IsEmail, IsEnum, IsMobilePhone, IsOptional, IsBoolean, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export enum FailedLoginAttemptStatus {
  ACTIVE = 'active',
  LOCKED = 'locked'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @Column()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password too weak. Must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
  })
  password: string;

  @Column()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @Column()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsMobilePhone()
  phone?: string;

  @Column({ nullable: true })
  @IsOptional()
  avatar?: string;

  @ManyToOne(() => Role, role => role.users, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Department, department => department.users, { nullable: true, eager: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @Column({ default: true })
  @IsBoolean()
  isActive: boolean;

  @Column({ default: false })
  @IsBoolean()
  isEmailVerified: boolean;

  @Column({ nullable: true })
  emailVerificationToken?: string;

  @Column({ nullable: true })
  passwordResetToken?: string;

  @Column({ nullable: true })
  passwordResetExpires?: Date;

  @OneToMany(() => RefreshToken, refreshToken => refreshToken.user)
  refreshTokens: RefreshToken[];

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @Column({ nullable: true })
  lastLoginIp?: string;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ nullable: true })
  lockedUntil?: Date;

  @Column({ nullable: true })
  twoFactorSecret?: string;

  @Column({ default: false })
  @IsBoolean()
  twoFactorEnabled: boolean;

  @Column('jsonb', { nullable: true })
  preferences?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}