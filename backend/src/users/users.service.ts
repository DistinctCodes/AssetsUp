import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(query?: { search?: string; role?: UserRole; page?: number; limit?: number }) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const qb = this.userRepository.createQueryBuilder('user')
      .skip((page - 1) * limit)
      .take(limit);

    if (query?.search) {
      qb.andWhere('(user.email ILIKE :s OR user.firstName ILIKE :s OR user.lastName ILIKE :s)', { s: `%${query.search}%` });
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

  async create(dto: { email: string; password: string; firstName: string; lastName: string; role?: UserRole }) {
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
    return this.sanitize(saved);
  }

  async updateRole(id: string, newRole: UserRole, requestingUserId?: string) {
    if (requestingUserId && requestingUserId === id) {
      throw new ForbiddenException('Cannot change your own role');
    }
    const user = await this.findById(id);
    user.role = newRole;
    const saved = await this.userRepository.save(user);
    return this.sanitize(saved);
  }

  async setActive(id: string, isActive: boolean) {
    const user = await this.findById(id);
    user.isActive = isActive;
    const saved = await this.userRepository.save(user);
    return this.sanitize(saved);
  }

  sanitize(user: User): User {
    const { passwordHash, ...safe } = user;
    return safe as User;
  }
}
