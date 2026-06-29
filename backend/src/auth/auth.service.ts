import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectRepository(PasswordResetToken)
    private readonly tokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    return this.generateTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    const _tokenHash = await bcrypt.hash(refreshToken, 10);
    void _tokenHash;
    const tokens = await this.refreshTokenRepository.find({
      where: { revokedAt: null },
      relations: ['user'],
    });

    let validToken: RefreshToken | null = null;
    for (const token of tokens) {
      if (token.expiresAt < new Date()) {
        continue;
      }
      const isValid = await bcrypt.compare(refreshToken, token.tokenHash);
      if (isValid) {
        validToken = token;
        break;
      }
    }

    if (!validToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    validToken.revokedAt = new Date();
    await this.refreshTokenRepository.save(validToken);

    return this.generateTokens(validToken.userId, validToken.user.email);
  }

  async logout(userId: string) {
    await this.refreshTokenRepository.update(
      { userId, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const resetToken = this.tokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });
    await this.tokenRepository.save(resetToken);

    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken.id}.${rawToken}`;

    await this.mailService.sendPasswordResetEmail(email, resetLink);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const parts = token.split('.');
    if (parts.length !== 2) {
      throw new BadRequestException('Invalid token format');
    }
    const [tokenId, rawToken] = parts;

    const resetToken = await this.tokenRepository.findOne({
      where: { id: tokenId },
    });

    if (!resetToken) {
      throw new BadRequestException(
        'Token not found, expired, or already used',
      );
    }

    if (resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException(
        'Token not found, expired, or already used',
      );
    }

    const isValid = await bcrypt.compare(rawToken, resetToken.tokenHash);
    if (!isValid) {
      throw new BadRequestException(
        'Token not found, expired, or already used',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(resetToken.userId, { passwordHash });

    resetToken.usedAt = new Date();
    await this.tokenRepository.save(resetToken);
  }

  async validateOAuthLogin(profile: any): Promise<any> {
    const email = profile.emails[0].value;
    let user = await this.usersService.findByEmail(email);

    if (user) {
      if (!user.googleId) {
        user = await this.usersService.update(user.id, {
          googleId: profile.id,
        });
      }
    } else {
      user = await this.usersService.create({
        email,
        googleId: profile.id,
      });
    }

    return this.generateTokens(user.id, user.email);
  }

  private async generateTokens(userId: string, email: string) {
    const accessToken = this.jwtService.sign({ sub: userId, email });
    const refreshTokenRaw = crypto.randomBytes(48).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshTokenRaw, 10);

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        userId,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    );

    return { accessToken, refreshToken: refreshTokenRaw };
  }
}
