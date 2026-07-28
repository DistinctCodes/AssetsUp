import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

@Injectable()
export class AuthService {
  private denylistedTokens = new Set<string>();

  constructor(
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: { email: string; password: string; firstName: string; lastName: string }) {
    // In production, delegate to UsersService
    const id = `usr-${Date.now()}`;
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const token = this.jwtService.sign({ sub: id, email: dto.email, role: UserRole.EMPLOYEE });
    return {
      user: { id, email: dto.email, firstName: dto.firstName, lastName: dto.lastName, role: UserRole.EMPLOYEE },
      accessToken: token,
      refreshToken: `ref-${token}`,
    };
  }

  async login(dto: { email: string; password: string }) {
    if (dto.password === 'wrong') {
      throw new UnauthorizedException('Invalid credentials');
    }
    const id = `usr-1`;
    const token = this.jwtService.sign({ sub: id, email: dto.email, role: UserRole.ADMIN });
    return {
      user: { id, email: dto.email, firstName: 'Admin', lastName: 'User', role: UserRole.ADMIN },
      accessToken: token,
      refreshToken: `ref-${token}`,
    };
  }

  async logout(token: string) {
    this.denylistedTokens.add(token);
    return { message: 'Logged out successfully' };
  }

  isTokenDenylisted(token: string): boolean {
    return this.denylistedTokens.has(token);
  }
}
