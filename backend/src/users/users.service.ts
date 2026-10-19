import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  LIKE_ESCAPE,
  containsPattern,
  resolveSort,
} from '../common/utils/list-query';
import { USER_SORT_COLUMNS } from './dto/list-users-query.dto';
import { PasswordService } from '../common/security/password.service';
import { User, UserRole } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { normalizeEmail } from './utils/normalize-email';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Optional() private readonly auditLogsService?: AuditLogsService,
    @Optional() passwords?: PasswordService,
  ) {
    this.passwords = passwords ?? new PasswordService();
  }

  private readonly passwords: PasswordService;

  async findAll(query?: {
    search?: string;
    role?: UserRole;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 20, 100);
    const sort = resolveSort(
      query?.sortBy,
      query?.sortOrder,
      USER_SORT_COLUMNS,
      'createdAt',
    );
    const qb = this.userRepository
      .createQueryBuilder('user')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy(`user.${sort.column}`, sort.order)
      .addOrderBy('user.id', 'ASC');

    if (query?.search) {
      qb.andWhere(
        `(user.email ILIKE :s ${LIKE_ESCAPE} OR user.firstName ILIKE :s ${LIKE_ESCAPE} OR user.lastName ILIKE :s ${LIKE_ESCAPE})`,
        { s: containsPattern(query.search) },
      );
    }
    if (query?.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((u) => this.sanitize(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: normalizeEmail(email) },
    });
  }

  async create(dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
  }) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await this.passwords.hash(dto.password);
    const user = this.userRepository.create({
      email: normalizeEmail(dto.email),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role || UserRole.EMPLOYEE,
    });
    const saved = await this.userRepository.save(user);
    await this.auditLogsService?.logAction({
      action: 'CREATED',
      entityType: 'user',
      entityId: saved.id,
      newValue: {
        email: saved.email,
        firstName: saved.firstName,
        lastName: saved.lastName,
        role: saved.role,
      },
    });
    return this.sanitize(saved);
  }

  async updateRole(id: string, newRole: UserRole, requestingUserId?: string) {
    if (requestingUserId && requestingUserId === id) {
      throw new ForbiddenException('Cannot change your own role');
    }
    const user = await this.findById(id);
    const previousRole = user.role;
    user.role = newRole;
    const saved = await this.userRepository.save(user);
    await this.auditLogsService?.logAction({
      action: 'ROLE_CHANGED',
      entityType: 'user',
      entityId: id,
      actorId: requestingUserId,
      previousValue: { role: previousRole },
      newValue: { role: newRole },
    });
    return this.sanitize(saved);
  }

  /**
   * Creates an account for an invited person. They get an unusable random
   * password and a 7-day password-set token. The raw token is only returned
   * when EXPOSE_RESET_TOKEN=true (local development), exactly like the
   * forgot-password flow, until email delivery is wired up.
   */
  async invite(
    dto: { email: string; firstName: string; lastName: string; role?: UserRole },
    invitedById?: string,
  ) {
    const created = await this.create({
      ...dto,
      password: crypto.randomBytes(24).toString('base64url'),
    });
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(inviteToken)
      .digest('hex');
    await this.setPasswordResetToken(
      created.id,
      tokenHash,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );
    await this.auditLogsService?.logAction({
      action: 'INVITED',
      entityType: 'user',
      entityId: created.id,
      actorId: invitedById,
      newValue: { email: created.email, role: created.role },
    });
    return process.env.EXPOSE_RESET_TOKEN === 'true'
      ? { ...created, inviteToken }
      : created;
  }

  async setActive(id: string, isActive: boolean, requestingUserId?: string) {
    if (requestingUserId && requestingUserId === id && !isActive) {
      throw new ForbiddenException('Cannot deactivate your own account');
    }
    const user = await this.findById(id);
    user.isActive = isActive;
    const saved = await this.userRepository.save(user);
    return this.sanitize(saved);
  }

  sanitize(user: User): User {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, refreshTokenHash, ...safe } = user;
    return safe as User;
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.findById(userId);

    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Current password is required to change password',
        );
      }
      const isMatch = await this.passwords.compare(
        dto.currentPassword,
        user.passwordHash,
      );
      if (!isMatch) {
        throw new BadRequestException('Current password is incorrect');
      }
      user.passwordHash = await this.passwords.hash(dto.newPassword);
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
    }

    const saved = await this.userRepository.save(user);
    await this.auditLogsService?.logAction({
      action: 'UPDATED',
      entityType: 'user',
      entityId: userId,
      actorId: userId,
      newValue: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordChanged: !!dto.newPassword,
      },
    });
    return this.sanitize(saved);
  }

  async setRefreshTokenHash(userId: string, hash: string | null) {
    await this.userRepository.update(userId, { refreshTokenHash: hash });
  }

  async setPasswordResetToken(
    userId: string,
    tokenHash: string,
    expires: Date,
  ) {
    await this.userRepository.update(userId, {
      passwordResetToken: tokenHash,
      passwordResetExpires: expires,
    });
  }

  async findByResetToken(tokenHash: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { passwordResetToken: tokenHash },
    });
  }

  async updatePassword(userId: string, passwordHash: string) {
    await this.userRepository.update(userId, {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpires: null,
      // Revoke existing sessions: an old refresh token must stop working.
      refreshTokenHash: null,
    });
  }
}
