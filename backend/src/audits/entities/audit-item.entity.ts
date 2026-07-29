import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditItemResult {
  PENDING = 'PENDING',
  FOUND = 'FOUND',
  MISSING = 'MISSING',
  WRONG_LOCATION = 'WRONG_LOCATION',
  DAMAGED = 'DAMAGED',
}

@Entity('audit_items')
export class AuditItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  auditSessionId: string;

  @Column()
  assetId: string;

  /** Snapshot of the asset's expected location at the time the checklist was generated. */
  @Column({ nullable: true })
  expectedLocationId?: string;

  @Column({
    type: 'enum',
    enum: AuditItemResult,
    default: AuditItemResult.PENDING,
  })
  result: AuditItemResult;

  @Column({ nullable: true })
  note?: string;

  @Column({ nullable: true })
  checkedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
