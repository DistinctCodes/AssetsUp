import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({
      email: dto.email,
      fullName: dto.fullName,
      password: passwordHash,
    });
    await this.userRepository.save(user);

    const accessToken = this.signAccess(user);
    return { user: this.sanitize(user), accessToken };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.signAccess(user);
    const refreshToken = this.signRefresh(user);
    return { accessToken, refreshToken };
  }

  private signAccess(user: User) {
    return this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '15m' },
    );
  }

  private signRefresh(user: User) {
    return this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'refresh' },
      { expiresIn: '7d' },
    );
  }

  private sanitize(user: User) {
    const { password, ...rest } = user as any;
    return rest;
  }
}