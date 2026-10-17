import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

/** bcrypt only uses the first 72 bytes; anything beyond is silently ignored. */
export const MAX_PASSWORD_BYTES = 72;
export const DEFAULT_BCRYPT_ROUNDS = 12;
const MIN_ROUNDS = 4;
const MAX_ROUNDS = 15;

/** The single place passwords are hashed and verified. */
@Injectable()
export class PasswordService {
  readonly rounds: number;

  constructor(@Optional() config?: ConfigService) {
    const raw = Number(config?.get('BCRYPT_ROUNDS'));
    this.rounds =
      Number.isInteger(raw) && raw >= MIN_ROUNDS && raw <= MAX_ROUNDS
        ? raw
        : DEFAULT_BCRYPT_ROUNDS;
  }

  async hash(password: string): Promise<string> {
    this.assertWithinLimit(password);
    return bcrypt.hash(password, this.rounds);
  }

  /** Verifies against existing `$2a$`/`$2b$` hashes, whatever their cost. */
  async compare(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) return false;
    return bcrypt.compare(password, hash);
  }

  assertWithinLimit(password: string): void {
    if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
      throw new BadRequestException(
        `Password must be at most ${MAX_PASSWORD_BYTES} bytes long`,
      );
    }
  }
}
