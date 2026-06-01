import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  findById(id: string) {
    return this.usersRepo.findOne({ where: { id } });
  }

  findByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email } });
  }

  async list(page = 1, perPage = 20) {
    const [items, total] = await this.usersRepo.findAndCount({
      where: {},
      skip: (page - 1) * perPage,
      take: perPage,
      order: { createdAt: 'DESC' },
    });
    return { items, total };
  }

  async updateProfile(id: string, patch: Partial<User>) {
    await this.usersRepo.update(id, patch);
    const user = await this.findById(id);
    if (!user) throw new NotFoundException();
    return user;
  }

  async changeRole(id: string, role: UserRole) {
    await this.usersRepo.update(id, { role });
    return this.findById(id);
  }

  async softDelete(id: string) {
    await this.usersRepo.softDelete(id);
  }

  async create(user: Partial<User>) {
    return this.usersRepo.save(this.usersRepo.create(user));
  }
}
