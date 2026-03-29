import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-strategy';
import { ApiKeysService } from '../../api-keys/api-keys.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private readonly apiKeysService: ApiKeysService) {
    super();
  }

  async authenticate(req: Request): Promise<void> {
    try {
      const user = await this.apiKeysService.authenticateHeader(req.headers['x-api-key']);
      if (!user) {
        return this.fail(new UnauthorizedException('Invalid API key'), 401);
      }

      this.success(user);
    } catch (error) {
      this.fail(error instanceof Error ? error : new UnauthorizedException(), 401);
    }
  }
}
