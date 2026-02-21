import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/user.entity';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: User; tokens: AuthTokens }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({
      email: dto.email.toLowerCase(),
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: hashedPassword,
    });

    const tokens = await this.signTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  async login(dto: LoginDto): Promise<{ user: User; tokens: AuthTokens }> {
    const user = await this.usersService.findByEmail(dto.email.toLowerCase());
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.signTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  async refresh(userId: string, incomingRefreshToken: string): Promise<AuthTokens> {
    const user = await this.usersService.findByRefreshToken(userId);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    const tokenMatch = await bcrypt.compare(incomingRefreshToken, user.refreshToken);
    if (!tokenMatch) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    const tokens = await this.signTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  private async signTokens(user: User): Promise<AuthTokens> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET', 'change-me-in-env'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'change-me-refresh'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    const hashed = await bcrypt.hash(token, 10);
    await this.usersService.updateRefreshToken(userId, hashed);
  }
}
