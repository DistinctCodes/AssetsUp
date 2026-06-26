import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-microsoft';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('MICROSOFT_CLIENT_ID', ''),
      clientSecret: configService.get<string>('MICROSOFT_CLIENT_SECRET', ''),
      callbackURL: configService.get<string>('MICROSOFT_CALLBACK_URL', 'http://localhost:3000/api/auth/microsoft/callback'),
      scope: ['user.read'],
      tenant: configService.get<string>('MICROSOFT_TENANT_ID', 'common'),
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    try {
      const result = await this.authService.validateOAuthLogin(profile);
      done(null, result);
    } catch (err) {
      done(err, false);
    }
  }
}
