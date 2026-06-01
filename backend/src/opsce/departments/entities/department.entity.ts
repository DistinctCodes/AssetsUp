import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

export const DEPARTMENT_CODE_PATTERN = /^[A-Z0-9-]{2,20}$/;

@Entity('departments')
export class Department {
  // ─── Identity ─────────────────────────────────────────────────────────────

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  parentId?: string;

  /**
   * Materialized path for efficient tree queries.
   * Format: "/{rootId}/{childId}/{...}/{thisId}/"
   */
  @Column({ length: 500, nullable: true })
  path?: string;

  @ManyToOne(() => Department, (d) => d.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent?: Department;

  @OneToMany(() => Department, (d) => d.parent)
  children: Department[];

  /**
   * Short uppercase code used in HR systems (e.g. "ENG", "FIN-OPS").
   * Must match DEPARTMENT_CODE_PATTERN when provided.
   */
  @Index('IDX_DEPT_CODE_ACTIVE', {
    where: '"deletedAt" IS NULL AND "code" IS NOT NULL',
  })
  @Column({ length: 20, nullable: true })
  code?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn()
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
    return this.path.split('/').filter(Boolean).slice(0, -1); // last segment is this department's own id
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
