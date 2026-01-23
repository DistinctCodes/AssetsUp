import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, CreateDateColumn } from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';

export enum Action {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  MANAGE = 'MANAGE'
}

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsString()
  @MaxLength(50)
  resource: string;

  @Column()
  @IsEnum(Action)
  action: Action;

  @Column('jsonb', { nullable: true })
  conditions?: Record<string, any>;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ManyToMany(() => Role, role => role.permissions)
  roles: Role[];

  @CreateDateColumn()
  createdAt: Date;
}