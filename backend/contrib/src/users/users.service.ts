import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  findAll(search?: string): Promise<User[]> {
    const qb = this.usersRepo.createQueryBuilder('user');
    if (search) {
      qb.where(
        'user.firstName ILIKE :s OR user.lastName ILIKE :s OR user.email ILIKE :s',
        { s: `%${search}%` },
      );
    }
    return qb.getMany();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
    if (!user) throw new NotFoundException(`User with email ${email} not found`);
    return user;
  }

  create(data: Partial<User>): Promise<User> {
    return this.usersRepo.save(this.usersRepo.create(data));
  }

  async updateRefreshToken(id: string, token: string | null): Promise<void> {
    await this.usersRepo.update(id, { refreshToken: token });
  }

  findByIdWithRefreshToken(id: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.refreshToken')
      .where('user.id = :id', { id })
      .getOne();
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findOne(id);
    user.role = role;
    return this.usersRepo.save(user);
  }

  async updateProfile(id: string, data: Partial<Pick<User, 'firstName' | 'lastName' | 'password'>>): Promise<User> {
    await this.usersRepo.update(id, data);
    return this.findOne(id);
  }
}
