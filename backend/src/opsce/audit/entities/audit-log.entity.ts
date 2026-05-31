import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true })
  userId?: string;

  @Column()
  action: string;

  @Index()
  @Column()
  resourceType: string;

  @Index()
  @Column()
  resourceId: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValue?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  newValue?: Record<string, unknown>;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
