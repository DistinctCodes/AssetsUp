import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { UserService } from '../users/user.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterInput, LoginResponse } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    const registerInput: RegisterInput = {
      email: createUserDto.email,
      password: createUserDto.password,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      phone: createUserDto.phone,
    };

    return await this.authService.register(registerInput);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { email, password } = req.body;
    const ip = req.ip;
    
    const result: LoginResponse = await this.authService.login(email, password, ip);
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict',
    });

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // Clear the refresh token cookie
    res.clearCookie('refresh_token');

    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) {
      throw new BadRequestException('Refresh token not provided');
    }

    const ip = req.ip;
    const result = await this.authService.refreshAccessToken(refreshToken, ip);
    
    return {
      accessToken: result.accessToken,
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    await this.authService.requestPasswordReset(email);
    return { message: 'Password reset email sent if account exists' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body('token') token: string,
    @Body('password') newPassword: string,
  ) {
    const success = await this.authService.resetPassword(token, newPassword);
    if (success) {
      return { message: 'Password reset successfully' };
    } else {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body('token') token: string) {
    const success = await this.authService.verifyEmail(token);
    if (success) {
      return { message: 'Email verified successfully' };
    } else {
      throw new BadRequestException('Invalid verification token');
    }
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body('email') email: string) {
    await this.authService.resendVerificationEmail(email);
    return { message: 'Verification email sent if account exists' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: Request,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    const userId = req.user['id'];
    const success = await this.authService.changePassword(userId, oldPassword, newPassword);
    if (success) {
      return { message: 'Password changed successfully' };
    } else {
      throw new BadRequestException('Failed to change password');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  async enable2FA(@Req() req: Request) {
    const userId = req.user['id'];
    return await this.authService.enableTwoFactorAuthentication(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  async verify2FA(
    @Req() req: Request,
    @Body('token') token: string,
  ) {
    const userId = req.user['id'];
    const isValid = await this.authService.verifyTwoFactorAuthentication(userId, token);
    return { isValid };
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  async disable2FA(@Req() req: Request) {
    const userId = req.user['id'];
    await this.authService.disableTwoFactorAuthentication(userId);
    return { message: '2FA disabled successfully' };
  }
}