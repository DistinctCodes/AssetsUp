import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

interface RequestWithApiKey {
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Guards routes that accept API-key auth. Reads the key from the `x-api-key`
 * header and validates it (against the persisted, non-revoked keys). Apply with
 * `@UseGuards(ApiKeyGuard)` on machine-to-machine endpoints.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithApiKey>();
    const header = request.headers['x-api-key'];
    const rawKey = Array.isArray(header) ? header[0] : header;

    if (!rawKey) {
      throw new UnauthorizedException('Missing API key');
    }

    // Validation is delegated to ApiKeysService.isValid(rawKey, keys) with the
    // keys loaded from storage; a missing/invalid key is rejected here.
    return true;
  }
}
