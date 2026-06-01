import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
  Check,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_DEPARTMENT_DEPTH = 5;
export const DEPARTMENT_CODE_PATTERN = /^[A-Z0-9_-]{2,20}$/;

// ─── Entity ───────────────────────────────────────────────────────────────────

@Entity('departments')
@Index('IDX_DEPT_PARENT_ACTIVE', ['parentId', 'isActive'])
@Index('IDX_DEPT_DELETED_AT', ['deletedAt'])
@Check(`"code" IS NULL OR LENGTH(TRIM("code")) > 0`)
@Check(`"name" <> ''`)
export class Department {

  // ─── Identity ─────────────────────────────────────────────────────────────

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_DEPT_NAME_ACTIVE', { where: '"deletedAt" IS NULL' })
  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Index('IDX_DEPT_CODE_ACTIVE', { where: '"deletedAt" IS NULL AND "code" IS NOT NULL' })
  @Column({ length: 20, nullable: true })
  code?: string;

  @Column({ default: true })
  isActive: boolean;

  // ─── Hierarchy ────────────────────────────────────────────────────────────

  @Column({ type: 'uuid', nullable: true })
  parentId?: string;

  /**
   * Materialized path for efficient ancestor/descendant queries.
   * Format: /<root-id>/<parent-id>/<this-id>/
   */
  @Column({ type: 'text', nullable: true })
  path?: string;

  @Column({ type: 'int', default: 0 })
  depth: number;

  @ManyToOne(() => Department, (d) => d.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parentId' })
  parent?: Department;

  @OneToMany(() => Department, (d) => d.parent, { cascade: ['soft-remove'] })
  children: Department[];

  // ─── Staffing ─────────────────────────────────────────────────────────────

  @Column({ type: 'uuid', nullable: true })
  headId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'headId' })
  head?: User;

  @ManyToMany(() => User, { cascade: false, eager: false })
  @JoinTable({
    name: 'department_members',
    joinColumn: { name: 'departmentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  members: User[];

  @Column({ type: 'int', default: 0 })
  memberCount: number;

  // ─── Budget ───────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  budgetAmount?: number;

  @Column({ length: 3, nullable: true })
  budgetCurrency?: string;

  @Column({ type: 'int', nullable: true })
  budgetYear?: number;

  // ─── Display / UX ─────────────────────────────────────────────────────────

  @Column({ length: 7, nullable: true })
  color?: string;

  @Column({ type: 'text', nullable: true })
  iconUrl?: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  // ─── Metadata ─────────────────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  // ─── Audit ────────────────────────────────────────────────────────────────

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string;

  @Column({ type: 'uuid', nullable: true })
  deletedBy?: string;

  // ─── Computed helpers ─────────────────────────────────────────────────────

  get isDeleted(): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  }

  get isRoot(): boolean {
    return !this.parentId;
  }

  get ancestorIds(): string[] {
    if (!this.path) return [];
    return this.path.split('/').filter(Boolean).slice(0, -1);
  }

  // ─── Lifecycle hooks ──────────────────────────────────────────────────────

  @BeforeInsert()
  @BeforeUpdate()
  validateCode(): void {
    if (this.code && !DEPARTMENT_CODE_PATTERN.test(this.code)) {
      throw new Error(
        `Department code "${this.code}" is invalid. Must match ${DEPARTMENT_CODE_PATTERN.source}`,
      );
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  normalizeStrings(): void {
    if (this.name) this.name = this.name.trim();
    if (this.description) this.description = this.description.trim();
    if (this.code) this.code = this.code.toUpperCase().trim();
  }
}
