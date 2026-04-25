import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async refresh(rawRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Decode token to get user id without verifying (we verify via bcrypt hash)
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('User not found or token revoked');
    }

    const tokenMatches = await bcrypt.compare(rawRefreshToken, user.refreshToken);
    if (!tokenMatches) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    return this.generateTokens(user.id, user.email);
  }

  async generateTokens(userId: string, email: string): Promise<{ accessToken: string; refreshToken: string }> {
    const jwtPayload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await this.usersService.save({ id: userId, refreshToken: hashedRefresh });

    return { accessToken, refreshToken };
  }
}
