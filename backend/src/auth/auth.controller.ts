import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  register(@Body() dto: { email: string; password: string; firstName: string; lastName: string }) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  login(@Body() dto: { email: string; password: string }) {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get authenticated user' })
  getMe(@Req() req: any) {
    return req.user || { id: 'usr-1', email: 'admin@example.com', role: 'ADMIN' };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  logout(@Headers('authorization') authHeader: string) {
    const token = authHeader?.replace('Bearer ', '') || '';
    return this.authService.logout(token);
  }
}
