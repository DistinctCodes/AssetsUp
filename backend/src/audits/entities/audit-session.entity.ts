import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AuditSessionStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

@Entity('audit_sessions')
export class AuditSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: AuditSessionStatus,
    default: AuditSessionStatus.DRAFT,
  })
  status: AuditSessionStatus;

  @Column({ nullable: true })
  scopeDepartmentId?: string;

  @Column({ nullable: true })
  scopeLocationId?: string;

  @Column({ nullable: true })
  createdByUserId?: string;

  @Column({ nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
