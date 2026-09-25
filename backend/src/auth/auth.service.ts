import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import * as crypto from 'crypto';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  // Explicit revocation list for refresh-token jtis, keyed by jti with the
  // token's own expiry so entries can be pruned once they'd have expired
  // naturally anyway. This is on top of (not instead of) the existing
  // hash-rotation check below: rotation alone only catches *reuse of the
  // previous* token, whereas this lets a specific token be revoked
  // outright (e.g. on logout) even if it's still the *current* one.
  //
  // Caveat: this is in-process memory, so it resets on restart and isn't
  // shared across multiple server instances. A production deployment
  // running more than one instance needs this backed by a shared store
  // (e.g. Redis) instead — noted here rather than silently assumed away.
  private readonly revokedRefreshTokenJtis = new Map<string, number>(); // jti -> exp (unix seconds)

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Optional() private readonly auditLogsService?: AuditLogsService,
  ) {}

  private pruneExpiredRevocations() {
    const now = Math.floor(Date.now() / 1000);
    for (const [jti, exp] of this.revokedRefreshTokenJtis) {
      if (exp <= now) this.revokedRefreshTokenJtis.delete(jti);
    }
  }

  private revokeRefreshToken(jti: string | undefined, exp: number | undefined) {
    if (!jti || !exp) return;
    this.revokedRefreshTokenJtis.set(jti, exp);
    this.pruneExpiredRevocations();
  }

  private sanitizeUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  private generateAccessToken(user: AuthUser) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m') as any,
    });
  }

  private generateRefreshToken(user: AuthUser) {
    const payload = {
      sub: user.id,
      email: user.email,
      type: 'refresh',
      jti: crypto.randomUUID(),
    };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d' as any,
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async generateTokenPair(user: AuthUser) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    const hash = this.hashToken(refreshToken);
    await this.usersService.setRefreshTokenHash(user.id, hash);
    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.EMPLOYEE,
    });

    const authUser = this.sanitizeUser(user);
    const tokens = await this.generateTokenPair(authUser);
    await this.auditLogsService?.logAction({
      action: 'CREATED',
      entityType: 'auth',
      entityId: authUser.id,
      actorId: authUser.id,
      newValue: { event: 'register' },
    });
    return {
      user: authUser,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const authUser = this.sanitizeUser(user);
    const tokens = await this.generateTokenPair(authUser);
    await this.auditLogsService?.logAction({
      action: 'CREATED',
      entityType: 'auth',
      entityId: authUser.id,
      actorId: authUser.id,
      newValue: { event: 'login' },
    });
    return {
      user: authUser,
      ...tokens,
    };
  }

  async getCurrentUser(user: User) {
    return this.sanitizeUser(user);
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      if (payload?.jti && this.revokedRefreshTokenJtis.has(payload.jti)) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user.refreshTokenHash) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      const submittedHash = this.hashToken(refreshToken);
      if (submittedHash !== user.refreshTokenHash) {
        // Token reuse detected — revoke session
        await this.usersService.setRefreshTokenHash(user.id, null);
        this.revokeRefreshToken(payload?.jti, payload?.exp);
        throw new UnauthorizedException(
          'Refresh token reuse detected — session revoked',
        );
      }

      // Rotation: this token has now been exchanged for a new pair, so it
      // must not be accepted again even though its hash is about to be
      // overwritten anyway — the explicit revocation closes the window
      // where a copy of this exact token (e.g. logged, cached) is replayed
      // before an attacker-triggered reuse would otherwise be detected.
      this.revokeRefreshToken(payload?.jti, payload?.exp);

      const authUser = this.sanitizeUser(user);
      const tokens = await this.generateTokenPair(authUser);
      return tokens;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string) {
    await this.usersService.setRefreshTokenHash(userId, null);

    if (refreshToken) {
      try {
        const payload = this.jwtService.decode(refreshToken) as {
          jti?: string;
          exp?: number;
        } | null;
        this.revokeRefreshToken(payload?.jti, payload?.exp);
      } catch {
        // Malformed token on logout isn't actionable — the user is being
        // logged out either way via the hash reset above.
      }
    }

    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = this.hashToken(resetToken);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.usersService.setPasswordResetToken(
      user.id,
      hashedToken,
      expires,
    );

    // TODO: send the resetToken via email instead of returning it.
    // Never return the raw token in production — anyone who knows a user's
    // email could otherwise call this endpoint and take over the account.
    if (process.env.NODE_ENV !== 'production') {
      return {
        message: 'Password reset instructions sent',
        resetToken,
      };
    }

    return { message: 'Password reset instructions sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token || !newPassword) {
      throw new BadRequestException('Token and new password are required');
    }

    const hashedToken = this.hashToken(token);
    const user = await this.usersService.findByResetToken(hashedToken);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user.id, passwordHash);

    return { message: 'Password reset successfully' };
  }
}
