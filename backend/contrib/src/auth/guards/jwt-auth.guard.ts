import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { verify } from 'jsonwebtoken';

interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
}

function jwtSecret(): string {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.JWT_SECRET || 'change-me-in-env';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.slice(7).trim();
    const secret = jwtSecret();

    try {
      const payload = verify(token, secret) as JwtPayload;
      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
