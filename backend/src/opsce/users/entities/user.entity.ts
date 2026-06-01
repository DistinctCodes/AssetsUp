import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
  Check,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum UserRole {
  ADMIN   = 'admin',
  MANAGER = 'manager',
  VIEWER  = 'viewer',
}

export enum UserStatus {
  ACTIVE    = 'active',
  SUSPENDED = 'suspended',
  PENDING   = 'pending',
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;

// ─── Entity ───────────────────────────────────────────────────────────────────

@Entity('users')
@Index('idx_users_email_deleted', ['email', 'deletedAt'])
@Index('idx_users_role_status',   ['role', 'status'])
@Check(`"failedLoginAttempts" >= 0`)
@Check(`"failedLoginAttempts" <= ${MAX_FAILED_ATTEMPTS}`)
export class User {
  // ─── Identity ──────────────────────────────────────────────────────────

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 254 })
  email: string;

  /**
   * Bcrypt hash of the user's password.
   * Excluded from all serialised responses via class-transformer.
   */
  @Exclude()
  @Column({ select: false })
  passwordHash: string;

  @Column({ length: 100 })
  fullName: string;

  /** Optional display name, separate from legal full name. */
  @Column({ length: 50, nullable: true })
  username?: string;

  // ─── Role & status ─────────────────────────────────────────────────────

  @Index()
  @Column({ type: 'enum', enum: UserRole, default: UserRole.VIEWER })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  // ─── Verification ───────────────────────────────────────────────────────

  @Column({ default: false })
  isVerified: boolean;

  /**
   * Short-lived token sent to the user's email address for verification.
   * Cleared once the user verifies their account.
   */
  @Exclude()
  @Column({ nullable: true, select: false })
  emailVerificationToken?: string;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerificationExpiresAt?: Date;

  /** Timestamp of the most recent email verification completion. */
  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt?: Date;

  // ─── Password reset ─────────────────────────────────────────────────────

  @Exclude()
  @Column({ nullable: true, select: false })
  passwordResetToken?: string;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetExpiresAt?: Date;

  // ─── Security ──────────────────────────────────────────────────────────

  /** Consecutive failed login attempts since last successful login. */
  @Column({ type: 'smallint', default: 0 })
  failedLoginAttempts: number;

  /** When set, the account is locked until this timestamp. */
  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil?: Date;

  /** Timestamp of the last successful login. */
  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  /** IP address from which the last login originated. */
  @Column({ nullable: true, length: 45 }) // 45 = max IPv6 length
  lastLoginIp?: string;

  // ─── Profile ───────────────────────────────────────────────────────────

  /** Public-facing bio shown on the user's profile. */
  @Column({ type: 'text', nullable: true })
  bio?: string;

  /** URL of the user's avatar image. */
  @Column({ nullable: true, length: 2048 })
  avatarUrl?: string;

  /** IANA timezone string, e.g. "America/New_York". */
  @Column({ nullable: true, length: 64 })
  timezone?: string;

  // ─── Preferences (JSON) ────────────────────────────────────────────────

  /**
   * Arbitrary user preferences stored as a JSON column.
   * Using `simple-json` avoids a separate table for simple key-value pairs.
   */
  @Column({ type: 'simple-json', nullable: true })
  preferences?: Record<string, unknown>;

  // ─── Timestamps ────────────────────────────────────────────────────────

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt?: Date;

  // ─── Lifecycle hooks ───────────────────────────────────────────────────

  /**
   * Hash `passwordHash` before insert if the raw password was set via
   * `setPassword()`. Prevents accidental plain-text storage.
   */
  @BeforeInsert()
  @BeforeUpdate()
  async hashPasswordIfNeeded(): Promise<void> {
    if (this._plainPassword) {
      this.passwordHash = await bcrypt.hash(this._plainPassword, BCRYPT_ROUNDS);
      this._plainPassword = undefined;
    }
  }

  /** Normalise email to lowercase before persisting. */
  @BeforeInsert()
  @BeforeUpdate()
  normaliseEmail(): void {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }

  // ─── Transient / virtual fields ────────────────────────────────────────

  /**
   * Transient plain-text password. Set via `setPassword()` — never persisted.
   * Excluded from serialisation by class-transformer.
   */
  @Exclude()
  private _plainPassword?: string;

  // ─── Domain methods ────────────────────────────────────────────────────

  /**
   * Stage a new plain-text password for hashing.
   * Call before `save()` — the `@BeforeInsert` / `@BeforeUpdate` hook
   * hashes and clears it automatically.
   */
  setPassword(plain: string): void {
    this._plainPassword = plain;
  }

  /**
   * Compare a candidate plain-text password against the stored hash.
   * Requires the entity to have been loaded with `{ select: true }` on
   * `passwordHash`, e.g. via a custom repository query.
   */
  async verifyPassword(candidate: string): Promise<boolean> {
    if (!this.passwordHash) return false;
    return bcrypt.compare(candidate, this.passwordHash);
  }

  /**
   * Record a successful login, resetting the failure counter and lock.
   */
  recordLoginSuccess(ip?: string): void {
    this.failedLoginAttempts = 0;
    this.lockedUntil         = undefined;
    this.lastLoginAt         = new Date();
    this.lastLoginIp         = ip;
  }

  /**
   * Increment the failed login counter. Locks the account for 30 minutes
   * once `MAX_FAILED_ATTEMPTS` consecutive failures accumulate.
   */
  recordLoginFailure(): void {
    this.failedLoginAttempts = Math.min(
      this.failedLoginAttempts + 1,
      MAX_FAILED_ATTEMPTS,
    );

    if (this.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      const thirtyMinutes = 30 * 60 * 1000;
      this.lockedUntil = new Date(Date.now() + thirtyMinutes);
    }
  }

  /** Whether the account is currently locked out due to failed attempts. */
  get isLocked(): boolean {
    return !!this.lockedUntil && this.lockedUntil > new Date();
  }

  /** Whether the account is active and able to log in. */
  get isActive(): boolean {
    return (
      this.status === UserStatus.ACTIVE &&
      this.isVerified &&
      !this.isLocked &&
      !this.deletedAt
    );
  }

  /** Whether the email verification token is still within its validity window. */
  isVerificationTokenValid(): boolean {
    return (
      !!this.emailVerificationToken &&
      !!this.emailVerificationExpiresAt &&
      this.emailVerificationExpiresAt > new Date()
    );
  }

  /** Whether the password reset token is still within its validity window. */
  isPasswordResetTokenValid(): boolean {
    return (
      !!this.passwordResetToken &&
      !!this.passwordResetExpiresAt &&
      this.passwordResetExpiresAt > new Date()
    );
  }

  /**
   * Resolve a user's display name in priority order:
   * username → first word of fullName → email local-part.
   */
  get displayName(): string {
    if (this.username) return this.username;
    if (this.fullName) return this.fullName.split(' ')[0];
    return this.email.split('@')[0];
  }

  /** Guard: only ADMIN users may perform privileged operations. */
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /** Guard: ADMIN or MANAGER may perform management operations. */
  canManage(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.MANAGER;
  }
}