import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum AuditAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ROLE_CHANGED = 'ROLE_CHANGED',
}

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['actorId'])
@Index(['createdAt'])
export class AuditLog {
  @ApiProperty({ description: 'Audit log UUID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'asset', description: 'Type of entity changed' })
  @Column()
  entityType: string;

  @ApiProperty({ description: 'UUID of the affected entity' })
  @Column()
  entityId: string;

  @ApiProperty({ enum: AuditAction })
  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @ApiProperty({ description: 'UUID of the user who made the change' })
  @Column({ nullable: true })
  actorId?: string;

  @ApiProperty({ description: 'Previous value as JSON' })
  @Column({ type: 'jsonb', nullable: true })
  previousValue?: Record<string, unknown>;

  @ApiProperty({ description: 'New value as JSON' })
  @Column({ type: 'jsonb', nullable: true })
  newValue?: Record<string, unknown>;

  @ApiProperty({ example: '192.168.1.1' })
  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
