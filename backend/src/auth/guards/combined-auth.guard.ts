import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { ApiKeysService } from '../../api-keys/api-keys.service';

@Injectable()
export class CombinedAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly apiKeysService: ApiKeysService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();

    const jwtUser = await this.tryJwt(request);
    if (jwtUser) {
      request.user = jwtUser;
      return true;
    }

    const apiKeyUser = await this.apiKeysService.authenticateHeader(
      request.headers['x-api-key'],
    );
    if (apiKeyUser) {
      request.user = apiKeyUser;
      return true;
    }

    throw new UnauthorizedException('Authentication required');
  }

  private async tryJwt(request: Request) {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        authHeader.slice(7),
        {
          secret: this.configService.get<string>('JWT_SECRET', 'change-me-in-env'),
        },
      );

      return await this.usersService.findByIdOrNull(payload.sub);
    } catch {
      return null;
    }
  }
}
