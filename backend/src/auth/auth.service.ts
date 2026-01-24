import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/user.service';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: any; // Omit password from user
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  async validateUser(email: string, password: string): Promise<any | null> {
    const user = await this.userService.findByEmail(email);
    if (!user || !user.isActive) {
      return null;
    }

    const isValidPassword = await this.validatePassword(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    // Remove password from returned user object
    const { password: _, ...result } = user;
    return result;
  }

  async login(email: string, password: string, ip: string): Promise<LoginResponse> {
    const user = await this.validateUser(email, password);
    if (!user) {
      // Increment failed login attempts
      await this.incrementFailedLoginAttempts(email);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      throw new ForbiddenException('Account is temporarily locked due to multiple failed login attempts');
    }

    // Reset failed login attempts on successful login
    await this.resetFailedLoginAttempts(user.id);

    // Update last login info
    await this.userService.update(user.id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = await this.generateRefreshToken(user.id, ip);

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async register(registerInput: RegisterInput): Promise<User> {
    const { email, password, firstName, lastName, phone } = registerInput;

    // Check if user already exists
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Get default role (e.g., 'User' role)
    let defaultRole = await this.roleRepository.findOne({ where: { name: 'User' } });
    if (!defaultRole) {
      // Create default User role if it doesn't exist
      defaultRole = new Role();
      defaultRole.name = 'User';
      defaultRole.description = 'Default user role';
      defaultRole.isActive = true;
      defaultRole.isSystemRole = true;
      await this.roleRepository.save(defaultRole);
    }

    // Create new user
    const newUser = new User();
    newUser.email = email;
    newUser.password = hashedPassword;
    newUser.firstName = firstName;
    newUser.lastName = lastName;
    newUser.phone = phone;
    newUser.role = defaultRole;
    newUser.isActive = true;
    newUser.isEmailVerified = false; // Email verification required

    return await this.userService.create(newUser);
  }

  async logout(refreshToken: string): Promise<void> {
    // Revoke the refresh token
    await this.refreshTokenRepository.update(
      { token: refreshToken },
      { revokedAt: new Date(), revokedByIp: 'unknown' }, // IP should be passed from request
    );
  }

  async refreshAccessToken(refreshToken: string, ip: string): Promise<{ accessToken: string }> {
    // Find the refresh token in the database
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired or revoked
    if (tokenRecord.expiresAt < new Date() || tokenRecord.revokedAt) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    // Generate new access token
    const payload = { sub: tokenRecord.user.id, email: tokenRecord.user.email };
    const newAccessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    // Rotate refresh token - create a new one and revoke the old one
    await this.rotateRefreshToken(tokenRecord, ip);

    return { accessToken: newAccessToken };
  }

  private async generateRefreshToken(userId: string, ip: string): Promise<string> {
    // Generate refresh token
    const token = this.jwtService.sign(
      { sub: userId },
      {
        expiresIn: '7d',
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'refresh-secret',
      },
    );

    // Hash the token before storing
    const hashedToken = await this.hashPassword(token);

    // Create refresh token record
    const refreshToken = new RefreshToken();
    refreshToken.user = await this.userService.findOne(userId);
    refreshToken.token = hashedToken;
    refreshToken.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    refreshToken.createdByIp = ip;

    await this.refreshTokenRepository.save(refreshToken);

    return token;
  }

  private async rotateRefreshToken(oldToken: RefreshToken, ip: string): Promise<void> {
    // Revoke the old token
    await this.refreshTokenRepository.update(
      { id: oldToken.id },
      { 
        revokedAt: new Date(), 
        revokedByIp: ip,
        replacedByToken: 'rotated' // Placeholder - in real scenario, this would be the new token ID
      },
    );
  }

  private async incrementFailedLoginAttempts(email: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
    if (!user) return;

    const failedAttempts = user.failedLoginAttempts + 1;
    let lockedUntil: Date | null = null;

    // Lock account after 5 failed attempts for 30 minutes
    if (failedAttempts >= 5) {
      lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }

    await this.userService.update(user.id, {
      failedLoginAttempts: failedAttempts,
      lockedUntil,
    });
  }

  private async resetFailedLoginAttempts(userId: string): Promise<void> {
    await this.userService.update(userId, {
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }

  async enableTwoFactorAuthentication(userId: string): Promise<{ secret: string, qrCodeUrl: string }> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate a secret for TOTP
    const secret = speakeasy.generateSecret({
      name: `${this.configService.get<string>('APP_NAME') || 'App'}:${user.email}`,
      issuer: this.configService.get<string>('APP_NAME') || 'App',
    });

    // Save the secret to the user record
    await this.userService.update(userId, {
      twoFactorSecret: secret.base32,
    });

    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url,
    };
  }

  async verifyTwoFactorAuthentication(userId: string, token: string): Promise<boolean> {
    const user = await this.userService.findOne(userId);
    if (!user || !user.twoFactorSecret) {
      return false;
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2, // Allow some time drift
    });

    if (isValid) {
      // Enable 2FA for the user
      await this.userService.update(userId, {
        twoFactorEnabled: true,
      });
    }

    return isValid;
  }

  async disableTwoFactorAuthentication(userId: string): Promise<void> {
    await this.userService.update(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });
  }

  async isTwoFactorAuthenticationEnabled(userId: string): Promise<boolean> {
    const user = await this.userService.findOne(userId);
    return user?.twoFactorEnabled ?? false;
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists to prevent enumeration attacks
      return;
    }

    // Generate password reset token
    const resetToken = this.jwtService.sign(
      { sub: user.id },
      {
        expiresIn: '1h', // Token expires in 1 hour
        secret: this.configService.get<string>('JWT_RESET_PASSWORD_SECRET') || 'reset-secret',
      },
    );

    // Update user with reset token and expiry
    await this.userService.update(user.id, {
      passwordResetToken: resetToken,
      passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    });

    // Send reset email
    await this.emailService.sendPasswordResetEmail(email, resetToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      // Verify token
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_RESET_PASSWORD_SECRET') || 'reset-secret',
      });

      const userId = decoded.sub;
      const user = await this.userService.findOne(userId);

      if (!user || user.passwordResetToken !== token || new Date() > user.passwordResetExpires) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update user with new password and clear reset token
      await this.userService.update(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      });

      return true;
    } catch (error) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  async verifyEmail(token: string): Promise<boolean> {
    try {
      // Verify token
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_EMAIL_VERIFY_SECRET') || 'email-verify-secret',
      });

      const userId = decoded.sub;
      const user = await this.userService.findOne(userId);

      if (!user || user.emailVerificationToken !== token) {
        throw new BadRequestException('Invalid verification token');
      }

      // Update user as verified
      await this.userService.update(user.id, {
        isEmailVerified: true,
        emailVerificationToken: null,
      });

      return true;
    } catch (error) {
      throw new BadRequestException('Invalid verification token');
    }
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
    if (!user || user.isEmailVerified) {
      // Don't reveal if email exists or is already verified
      return;
    }

    // Generate new verification token
    const verificationToken = this.jwtService.sign(
      { sub: user.id },
      {
        expiresIn: '24h', // Token expires in 24 hours
        secret: this.configService.get<string>('JWT_EMAIL_VERIFY_SECRET') || 'email-verify-secret',
      },
    );

    // Update user with new verification token
    await this.userService.update(user.id, {
      emailVerificationToken: verificationToken,
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(email, verificationToken);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify old password
    const isOldPasswordValid = await this.validatePassword(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BadRequestException('Invalid current password');
    }

    // Hash new password
    const hashedNewPassword = await this.hashPassword(newPassword);

    // Update user with new password
    await this.userService.update(userId, {
      password: hashedNewPassword,
    });

    return true;
  }
}