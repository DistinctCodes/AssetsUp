import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/user.entity';
import { MailService } from '../mail/mail.service';
import { PasswordResetService } from './services/password-reset.service';

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
    private readonly mailService: MailService,
    private readonly passwordResetService: PasswordResetService,
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

  async login(
    dto: LoginDto,
  ): Promise<
    | { user: User; tokens: AuthTokens }
    | { requiresTwoFactor: true; tempToken: string }
  > {
    const user = await this.usersService.findByEmail(dto.email.toLowerCase());
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.twoFactorEnabled) {
      const tempToken = await this.jwtService.signAsync(
        { sub: user.id, twoFactorPending: true },
        {
          secret: this.configService.get<string>('JWT_SECRET', 'change-me-in-env'),
          expiresIn: '5m',
        },
      );
      return { requiresTwoFactor: true, tempToken };
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

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email.toLowerCase());
    if (!user) {
      return;
    }

    const rawToken = await this.passwordResetService.issueToken(user.id);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    await this.mailService.sendMail({
      to: user.email,
      subject: 'Reset your AssetsUp password',
      text: `Use the link below to reset your password:\n${resetUrl}\n\nIf you did not request this, ignore this message.`,
      html: `<p>Use the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenRecord = await this.passwordResetService.findValidToken(token);
    if (!tokenRecord) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePassword(tokenRecord.userId, hashedPassword);
    await this.passwordResetService.markUsed(tokenRecord.id);
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

  // ── 2FA ──────────────────────────────────────────────────────────

  async twoFactorSetup(userId: string): Promise<{ otpauthUrl: string; qrCodeDataUrl: string }> {
    const user = await this.usersService.findById(userId);
    const secret = speakeasy.generateSecret({
      name: `ManageAssets (${user.email})`,
    });

    await this.usersService.updateTwoFactor(userId, secret.base32, false);

    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url!);
    return { otpauthUrl: secret.otpauth_url!, qrCodeDataUrl };
  }

  async twoFactorEnable(userId: string, code: string): Promise<void> {
    const user = await this.usersService.findByIdWithTwoFactor(userId);
    if (!user?.twoFactorSecret) {
      throw new BadRequestException('2FA setup not initiated. Call /auth/2fa/setup first.');
    }

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!valid) throw new UnauthorizedException('Invalid TOTP code');

    await this.usersService.updateTwoFactor(userId, user.twoFactorSecret, true);
  }

  async twoFactorDisable(userId: string, code: string): Promise<void> {
    const user = await this.usersService.findByIdWithTwoFactor(userId);
    if (!user?.twoFactorSecret) {
      throw new BadRequestException('2FA is not set up for this account.');
    }

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!valid) throw new UnauthorizedException('Invalid TOTP code');

    await this.usersService.updateTwoFactor(userId, null, false);
  }

  async twoFactorVerify(tempToken: string, code: string): Promise<AuthTokens> {
    let payload: { sub: string; twoFactorPending?: boolean };
    try {
      payload = await this.jwtService.verifyAsync(tempToken, {
        secret: this.configService.get<string>('JWT_SECRET', 'change-me-in-env'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired temp token');
    }

    if (!payload.twoFactorPending) {
      throw new UnauthorizedException('Token is not a 2FA pending token');
    }

    const user = await this.usersService.findByIdWithTwoFactor(payload.sub);
    if (!user?.twoFactorSecret) {
      throw new UnauthorizedException('2FA not configured');
    }

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!valid) throw new UnauthorizedException('Invalid TOTP code');

    const tokens = await this.signTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }
}
