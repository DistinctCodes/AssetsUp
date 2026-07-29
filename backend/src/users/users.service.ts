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
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Optional() private readonly auditLogsService?: AuditLogsService,
  ) {}

  async findAll(query?: {
    search?: string;
    role?: UserRole;
    page?: number;
    limit?: number;
  }) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const qb = this.userRepository
      .createQueryBuilder('user')
      .skip((page - 1) * limit)
      .take(limit);

    if (query?.search) {
      qb.andWhere(
        '(user.email ILIKE :s OR user.firstName ILIKE :s OR user.lastName ILIKE :s)',
        { s: `%${query.search}%` },
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
    return this.userRepository.findOne({ where: { email } });
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

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      email: dto.email,
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

  async setActive(id: string, isActive: boolean) {
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
      const isMatch = await bcrypt.compare(
        dto.currentPassword,
        user.passwordHash,
      );
      if (!isMatch) {
        throw new BadRequestException('Current password is incorrect');
      }
      user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
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
}
