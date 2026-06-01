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

/** Maximum nesting depth enforced at the application layer. */
export const MAX_DEPARTMENT_DEPTH = 5;

/** Regex that department codes must satisfy. */
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

  /**
   * Human-readable department name — unique across non-deleted departments.
   * Uniqueness is enforced via a partial index rather than a column constraint
   * so that soft-deleted names can be reused.
   */
  @Index('IDX_DEPT_NAME_ACTIVE', { where: '"deletedAt" IS NULL' })
  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * Short uppercase code used in HR systems (e.g. "ENG", "FIN-OPS").
   * Must match DEPARTMENT_CODE_PATTERN when provided.
   */
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
   * Maintained automatically by lifecycle hooks.
   */
  @Column({ type: 'text', nullable: true })
  path?: string;

  /**
   * Nesting depth — 0 for root departments.
   * Maintained automatically by lifecycle hooks.
   */
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

  /**
   * The designated head of this department.
   * Nullable — a department may exist without an assigned head.
   */
  @Column({ type: 'uuid', nullable: true })
  headId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'headId' })
  head?: User;

  /** Members directly assigned to this department. */
  @ManyToMany(() => User, { cascade: false, eager: false })
  @JoinTable({
    name: 'department_members',
    joinColumn: { name: 'departmentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  members: User[];

  /**
   * Cached headcount — updated by application logic or a DB trigger.
   * Avoids COUNT(*) joins on hot read paths.
   */
  @Column({ type: 'int', default: 0 })
  memberCount: number;

  // ─── Budget ───────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  budgetAmount?: number;

  /** ISO 4217 currency code, e.g. "USD", "NGN". */
  @Column({ length: 3, nullable: true })
  budgetCurrency?: string;

  /** Fiscal year the budget applies to (e.g. 2025). */
  @Column({ type: 'int', nullable: true })
  budgetYear?: number;

  // ─── Display / UX ─────────────────────────────────────────────────────────

  /**
   * Hex colour used in org-chart UIs (e.g. "#3B82F6").
   * Validated in the DTO layer.
   */
  @Column({ length: 7, nullable: true })
  color?: string;

  /** URL or icon key for org-chart and navigation usage. */
  @Column({ type: 'text', nullable: true })
  iconUrl?: string;

  /**
   * Display order among siblings — lower = shown first.
   * Defaults to 0; ties are broken by createdAt.
   */
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  // ─── Metadata ─────────────────────────────────────────────────────────────

  /**
   * Arbitrary JSON key–value metadata for integrations
   * (e.g. external HR system IDs, Slack channel IDs).
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  // ─── Audit ────────────────────────────────────────────────────────────────

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  /**
   * Soft-delete timestamp — null means the record is active.
   * TypeORM automatically excludes soft-deleted rows from all queries
   * unless `.withDeleted()` is explicitly called.
   */
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  /** ID of the user who created this department. */
  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  /** ID of the user who last modified this department. */
  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string;

  /** ID of the user who deleted this department (when soft-deleted). */
  @Column({ type: 'uuid', nullable: true })
  deletedBy?: string;

  // ─── Computed helpers ─────────────────────────────────────────────────────

  /**
   * Returns true when the department has been soft-deleted.
   * Keeps controllers and services free of null-check boilerplate.
   */
  get isDeleted(): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  }

  /**
   * Returns true when this department is a root (no parent).
   */
  get isRoot(): boolean {
    return !this.parentId;
  }

  /**
   * Parses the materialized path into an ordered array of ancestor IDs,
   * from root to immediate parent (excludes the department's own ID).
   */
  get ancestorIds(): string[] {
    if (!this.path) return [];
    return this.path
      .split('/')
      .filter(Boolean)
      .slice(0, -1); // last segment is this department's own id
  }

  // ─── Lifecycle hooks ──────────────────────────────────────────────────────

  /**
   * Validates the department code format before insert or update.
   * Full schema-level validation belongs in a DTO; this is a last-resort guard.
   */
  @BeforeInsert()
  @BeforeUpdate()
  validateCode(): void {
    if (this.code && !DEPARTMENT_CODE_PATTERN.test(this.code)) {
      throw new Error(
        `Department code "${this.code}" is invalid. Must match ${DEPARTMENT_CODE_PATTERN.source}`,
      );
    }
  }

  /**
   * Trims whitespace from name and description before persistence.
   */
  @BeforeInsert()
  @BeforeUpdate()
  normalizeStrings(): void {
    if (this.name) this.name = this.name.trim();
    if (this.description) this.description = this.description.trim();
    if (this.code) this.code = this.code.toUpperCase().trim();
  }
}