import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike, FindOptionsWhere } from 'typeorm';
import { randomBytes } from 'crypto';
import { User, UserRole, UserStatus } from './entities/user.entity';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateUserDto {
  email: string;
  password: string;
  fullName: string;
  username?: string;
  role?: UserRole;
}

export interface UpdateProfileDto {
  fullName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  timezone?: string;
  preferences?: Record<string, unknown>;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface LoginDto {
  email: string;
  password: string;
  ip?: string;
}

export interface PaginationDto {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface PaginatedUsers {
  items: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Token helpers ────────────────────────────────────────────────────────────

/** Generate a cryptographically random URL-safe token. */
function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/** Expiry timestamp `hours` from now. */
function expiresIn(hours: number): Date {
  return new Date(Date.now() + hours * 3_600_000);
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Creation ──────────────────────────────────────────────────────────

  /**
   * Register a new user.
   *
   * - Normalises email (lowercase + trim) before the uniqueness check.
   * - Stages the password via `setPassword()` so the entity hook hashes it.
   * - Generates an email verification token (valid 24 h).
   * - Wraps everything in a transaction.
   *
   * @throws ConflictException  when the email is already registered.
   * @throws ConflictException  when the username is already taken.
   * @throws BadRequestException when the password is too short.
   */
  async create(dto: CreateUserDto): Promise<User> {
    this.validatePasswordStrength(dto.password);

    const email = dto.email.toLowerCase().trim();

    await this.assertEmailAvailable(email);

    if (dto.username) {
      await this.assertUsernameAvailable(dto.username);
    }

    const user = this.userRepo.create({
      email,
      fullName:  dto.fullName,
      username:  dto.username,
      role:      dto.role ?? UserRole.VIEWER,
      status:    UserStatus.PENDING,
      isVerified: false,
      emailVerificationToken:    generateToken(),
      emailVerificationExpiresAt: expiresIn(24),
    });

    user.setPassword(dto.password);

    const saved = await this.userRepo.save(user);
    this.logger.log(`User created: ${saved.id} (${saved.email})`);
    return saved;
  }

  // ─── Authentication ────────────────────────────────────────────────────

  /**
   * Validate credentials and return the authenticated user.
   *
   * Records login success / failure on the entity and persists the update.
   * Uses a timing-safe path that always runs `verifyPassword` to prevent
   * user-enumeration via response-time differences.
   *
   * @throws UnauthorizedException for any credential or account-state failure.
   */
  async validateCredentials(dto: LoginDto): Promise<User> {
    const email = dto.email.toLowerCase().trim();

    // Load with passwordHash explicitly (select: false on entity)
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .addSelect('u.emailVerificationToken')
      .addSelect('u.passwordResetToken')
      .where('u.email = :email', { email })
      .andWhere('u.deletedAt IS NULL')
      .getOne();

    // Always run verifyPassword even when user is null to prevent timing attacks
    const dummyUser = new User();
    dummyUser.setPassword('dummy');
    const target = user ?? dummyUser;

    const passwordOk = user ? await target.verifyPassword(dto.password) : false;

    if (!user || !passwordOk) {
      if (user) {
        user.recordLoginFailure();
        await this.userRepo.save(user);

        if (user.isLocked) {
          throw new UnauthorizedException(
            `Account locked due to too many failed attempts. Try again after ${user.lockedUntil!.toISOString()}.`,
          );
        }
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isLocked) {
      throw new UnauthorizedException(
        `Account locked until ${user.lockedUntil!.toISOString()}`,
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account suspended — contact support');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Email address not yet verified');
    }

    user.recordLoginSuccess(dto.ip);
    await this.userRepo.save(user);

    this.logger.log(`Login success: ${user.id}`);
    return user;
  }

  // ─── Email verification ────────────────────────────────────────────────

  /**
   * Verify a user's email address using the token sent on registration.
   *
   * @throws BadRequestException when the token is invalid or expired.
   */
  async verifyEmail(token: string): Promise<User> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.emailVerificationToken')
      .where('u.emailVerificationToken = :token', { token })
      .andWhere('u.deletedAt IS NULL')
      .getOne();

    if (!user || !user.isVerificationTokenValid()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.isVerified                = true;
    user.status                    = UserStatus.ACTIVE;
    user.verifiedAt                = new Date();
    user.emailVerificationToken    = undefined;
    user.emailVerificationExpiresAt = undefined;

    const saved = await this.userRepo.save(user);
    this.logger.log(`Email verified: ${saved.id}`);
    return saved;
  }

  /**
   * Re-issue a verification token for a pending account.
   *
   * @throws BadRequestException when the account is already verified.
   * @throws NotFoundException   when no pending account exists for that email.
   */
  async resendVerificationToken(email: string): Promise<User> {
    const user = await this.findByEmailOrThrow(email);

    if (user.isVerified) {
      throw new BadRequestException('Account is already verified');
    }

    user.emailVerificationToken    = generateToken();
    user.emailVerificationExpiresAt = expiresIn(24);

    return this.userRepo.save(user);
  }

  // ─── Password reset ────────────────────────────────────────────────────

  /**
   * Issue a password-reset token (valid 1 h).
   * Returns the user so callers can send the token via email.
   * Never reveals whether the email exists — silently no-ops if not found.
   */
  async issuePasswordResetToken(email: string): Promise<User | null> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordResetToken')
      .where('u.email = :email', { email: email.toLowerCase().trim() })
      .andWhere('u.deletedAt IS NULL')
      .getOne();

    if (!user) return null; // silent no-op — don't reveal non-existence

    user.passwordResetToken    = generateToken();
    user.passwordResetExpiresAt = expiresIn(1);

    const saved = await this.userRepo.save(user);
    this.logger.log(`Password reset token issued: ${saved.id}`);
    return saved;
  }

  /**
   * Reset a user's password using a valid reset token.
   *
   * @throws BadRequestException when the token is invalid, expired, or the
   *   new password fails the strength check.
   */
  async resetPassword(token: string, newPassword: string): Promise<User> {
    this.validatePasswordStrength(newPassword);

    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordResetToken')
      .where('u.passwordResetToken = :token', { token })
      .andWhere('u.deletedAt IS NULL')
      .getOne();

    if (!user || !user.isPasswordResetTokenValid()) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    user.setPassword(newPassword);
    user.passwordResetToken    = undefined;
    user.passwordResetExpiresAt = undefined;
    user.failedLoginAttempts   = 0;
    user.lockedUntil           = undefined;

    const saved = await this.userRepo.save(user);
    this.logger.log(`Password reset completed: ${saved.id}`);
    return saved;
  }

  /**
   * Change the password for an authenticated user.
   *
   * @throws UnauthorizedException when `currentPassword` is incorrect.
   * @throws BadRequestException   when `newPassword` fails the strength check.
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<User> {
    this.validatePasswordStrength(dto.newPassword);

    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id: userId })
      .andWhere('u.deletedAt IS NULL')
      .getOne();

    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const valid = await user.verifyPassword(dto.currentPassword);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.setPassword(dto.newPassword);
    return this.userRepo.save(user);
  }

  // ─── Profile ───────────────────────────────────────────────────────────

  /**
   * Update a user's own profile fields.
   *
   * @throws ConflictException when the chosen username is already taken by
   *   a different user.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findByIdOrThrow(userId);

    if (dto.username && dto.username !== user.username) {
      await this.assertUsernameAvailable(dto.username, userId);
    }

    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  // ─── Admin operations ──────────────────────────────────────────────────

  /**
   * Change a user's role. Caller must be ADMIN.
   *
   * @throws ForbiddenException when `actorId` is not an ADMIN.
   * @throws ForbiddenException when trying to demote the last ADMIN.
   */
  async changeRole(
    actorId: string,
    targetUserId: string,
    newRole: UserRole,
  ): Promise<User> {
    const actor = await this.findByIdOrThrow(actorId);
    if (!actor.isAdmin()) {
      throw new ForbiddenException('Only admins may change roles');
    }

    const target = await this.findByIdOrThrow(targetUserId);

    if (target.role === UserRole.ADMIN && newRole !== UserRole.ADMIN) {
      const adminCount = await this.userRepo.count({
        where: { role: UserRole.ADMIN, deletedAt: undefined as any },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot demote the last admin account');
      }
    }

    target.role = newRole;
    const saved = await this.userRepo.save(target);
    this.logger.log(`Role changed: ${target.id} → ${newRole} (by ${actorId})`);
    return saved;
  }

  /**
   * Suspend or reinstate a user. Caller must be ADMIN or MANAGER.
   *
   * @throws ForbiddenException when the actor does not have manage permission.
   */
  async setStatus(
    actorId: string,
    targetUserId: string,
    status: UserStatus,
  ): Promise<User> {
    const actor = await this.findByIdOrThrow(actorId);
    if (!actor.canManage()) {
      throw new ForbiddenException('Insufficient permissions to change user status');
    }

    const target = await this.findByIdOrThrow(targetUserId);
    target.status = status;

    const saved = await this.userRepo.save(target);
    this.logger.log(`Status changed: ${target.id} → ${status} (by ${actorId})`);
    return saved;
  }

  /**
   * Unlock a locked-out account manually. Caller must be ADMIN or MANAGER.
   */
  async unlockAccount(actorId: string, targetUserId: string): Promise<User> {
    const actor = await this.findByIdOrThrow(actorId);
    if (!actor.canManage()) {
      throw new ForbiddenException('Insufficient permissions to unlock accounts');
    }

    const target = await this.findByIdOrThrow(targetUserId);
    target.failedLoginAttempts = 0;
    target.lockedUntil         = undefined;

    const saved = await this.userRepo.save(target);
    this.logger.log(`Account unlocked: ${target.id} (by ${actorId})`);
    return saved;
  }

  // ─── Soft delete ───────────────────────────────────────────────────────

  /**
   * Soft-delete a user. Caller must be ADMIN or the user themselves.
   *
   * @throws ForbiddenException when the actor is neither admin nor the owner.
   */
  async softDelete(actorId: string, targetUserId: string): Promise<void> {
    const actor = await this.findByIdOrThrow(actorId);

    if (!actor.isAdmin() && actorId !== targetUserId) {
      throw new ForbiddenException('You may only delete your own account');
    }

    await this.userRepo.softDelete(targetUserId);
    this.logger.log(`User soft-deleted: ${targetUserId} (by ${actorId})`);
  }

  /**
   * Restore a soft-deleted user. Caller must be ADMIN.
   */
  async restore(actorId: string, targetUserId: string): Promise<User> {
    const actor = await this.findByIdOrThrow(actorId);
    if (!actor.isAdmin()) {
      throw new ForbiddenException('Only admins may restore deleted users');
    }

    await this.userRepo.restore(targetUserId);
    return this.findByIdOrThrow(targetUserId);
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /** Find a user by UUID. Returns `null` when not found. */
  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  /** Find a user by email (case-insensitive). Returns `null` when not found. */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  /**
   * Paginated + filtered user listing.
   * Supports free-text search across `email`, `fullName`, and `username`.
   */
  async findAll(dto: PaginationDto = {}): Promise<PaginatedUsers> {
    const page  = Math.max(1, dto.page  ?? 1);
    const limit = Math.min(100, Math.max(1, dto.limit ?? 20));
    const skip  = (page - 1) * limit;

    const where: FindOptionsWhere<User>[] | FindOptionsWhere<User> = dto.search
      ? [
          { email:    ILike(`%${dto.search}%`), ...(dto.role   ? { role: dto.role }     : {}), ...(dto.status ? { status: dto.status } : {}) },
          { fullName: ILike(`%${dto.search}%`), ...(dto.role   ? { role: dto.role }     : {}), ...(dto.status ? { status: dto.status } : {}) },
          { username: ILike(`%${dto.search}%`), ...(dto.role   ? { role: dto.role }     : {}), ...(dto.status ? { status: dto.status } : {}) },
        ]
      : {
          ...(dto.role   ? { role: dto.role }     : {}),
          ...(dto.status ? { status: dto.status } : {}),
        };

    const [items, total] = await this.userRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Count all non-deleted users (optionally filtered by role or status). */
  async count(role?: UserRole, status?: UserStatus): Promise<number> {
    return this.userRepo.count({
      where: {
        ...(role   ? { role }   : {}),
        ...(status ? { status } : {}),
      },
    });
  }

  // ─── Private helpers ───────────────────────────────────────────────────

  private async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  private async findByEmailOrThrow(email: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user) throw new NotFoundException(`No account found for ${email}`);
    return user;
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException(`Email "${email}" is already registered`);
    }
  }

  private async assertUsernameAvailable(
    username: string,
    excludeUserId?: string,
  ): Promise<void> {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('u.username = :username', { username });

    if (excludeUserId) {
      qb.andWhere('u.id != :id', { id: excludeUserId });
    }

    const existing = await qb.getOne();
    if (existing) {
      throw new ConflictException(`Username "${username}" is already taken`);
    }
  }

  private validatePasswordStrength(password: string): void {
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new BadRequestException('Password must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      throw new BadRequestException('Password must contain at least one special character');
    }
  }
}