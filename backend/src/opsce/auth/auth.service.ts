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
import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';

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
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(PasswordResetToken)
    private readonly resetRepo: Repository<PasswordResetToken>,
  ) {}

  async validateUser(email: string, plainPassword: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const match = await bcrypt.compare(plainPassword, user.passwordHash);
    return match ? user : null;
  }

  async login(user: User) {
    return this.issueTokens(user);
  }

  async refreshToken(refreshToken: string) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET', 'change-this-secret'),
      });
    } catch (error) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token invalid or already used');
    }

    const tokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!tokenMatches) {
      throw new UnauthorizedException('Refresh token invalid or already used');
    }

    return this.issueTokens(user);
  }

  async logout(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) return;
    await this.usersService.updateProfile(userId, { refreshTokenHash: null } as any);
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return;

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    const resetToken = this.resetRepo.create({ token, expiresAt, user, userId: user.id });
    await this.resetRepo.save(resetToken);

    const transporter = this.createTransporter();
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const from = this.configService.get<string>('SMTP_FROM', `no-reply@${new URL(frontendUrl).hostname}`);
    const mailOptions = {
      from,
      to: user.email,
      subject: 'Password reset request',
      text: `Use the link below to reset your password:\n\n${frontendUrl}/reset-password?token=${token}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`,
      html: `<p>Use the link below to reset your password:</p><p><a href="${frontendUrl}/reset-password?token=${token}">${frontendUrl}/reset-password?token=${token}</a></p><p>This link expires in 1 hour. If you did not request this, ignore this email.</p>`,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      throw new InternalServerErrorException('Failed to send password reset email');
    }
  }

  async resetPassword(token: string, newPassword: string) {
    const resetToken = await this.resetRepo.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Token is invalid or expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.updateProfile(resetToken.userId, { passwordHash, refreshTokenHash: null } as any);
    await this.resetRepo.delete(resetToken.id);
  }

  private async issueTokens(user: User) {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: 'access',
      },
      {
        secret: this.configService.get<string>('JWT_SECRET', 'change-this-secret'),
        expiresIn: '15m',
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        type: 'refresh',
      },
      {
        secret: this.configService.get<string>('JWT_SECRET', 'change-this-secret'),
        expiresIn: '7d',
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateProfile(user.id, { refreshTokenHash } as any);

    return { accessToken, refreshToken };
  }

  private createTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<number>('SMTP_PORT') ?? 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';

    return require('nodemailer').createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }
}
