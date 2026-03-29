import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PasswordResetToken } from '../entities/password-reset-token.entity';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokensRepo: Repository<PasswordResetToken>,
  ) {}

  async issueToken(userId: string): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const hashed = await bcrypt.hash(rawToken, 12);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.tokensRepo.save(
      this.tokensRepo.create({
        userId,
        token: hashed,
        expiresAt,
      }),
    );

    return rawToken;
  }

  async findValidToken(rawToken: string): Promise<PasswordResetToken | null> {
    const now = new Date();
    const tokens = await this.tokensRepo.find({
      where: {
        usedAt: null,
        expiresAt: MoreThan(now),
      },
      order: { createdAt: 'DESC' },
    });

    for (const token of tokens) {
      if (await bcrypt.compare(rawToken, token.token)) {
        return token;
      }
    }

    return null;
  }

  async markUsed(id: string): Promise<void> {
    await this.tokensRepo.update(id, { usedAt: new Date() });
  }
}
