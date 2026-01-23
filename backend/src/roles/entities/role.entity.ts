import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Permission } from '../../permissions/entities/permission.entity';
import { User } from '../../users/entities/user.entity';
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsString()
  @MaxLength(50)
  name: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ManyToMany(() => Permission, permission => permission.roles, { eager: true })
  permissions: Permission[];

  @Column({ default: false })
  @IsBoolean()
  isSystemRole: boolean;

  @Column({ default: true })
  @IsBoolean()
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => User, user => user.role)
  users: User[];
}