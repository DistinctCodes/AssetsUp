import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findOne(id: string): Promise<User | undefined> {
    return await this.userRepository.findOne({ 
      where: { id }, 
      relations: ['role', 'department'] 
    });
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return await this.userRepository.findOne({ 
      where: { email }, 
      relations: ['role', 'department'] 
    });
  }

  async create(data: CreateUserDto | User): Promise<User> {
    const user: any = this.userRepository.create(data as any);
    return await this.userRepository.save(user);
  }

  async update(id: string, updateUserDto: Partial<User>): Promise<User> {
    await this.userRepository.update(id, updateUserDto);
    return await this.findOne(id);
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      relations: ['role', 'department'],
      where: { deletedAt: null }
    });
  }

  async remove(id: string): Promise<void> {
    await this.userRepository.softDelete(id);
  }
}