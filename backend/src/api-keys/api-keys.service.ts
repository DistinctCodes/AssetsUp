import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { ApiKey } from './api-key.entity';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly repo: Repository<ApiKey>,
  ) {}

  async create(
    userId: string,
    name: string,
    scopes: string[],
    expiresAt?: Date,
  ) {
    const rawKey = `ak_${crypto.randomBytes(32).toString('hex')}`;
    const prefix = rawKey.substring(3, 11);
    const keyHash = await bcrypt.hash(rawKey, 10);
    const entity = this.repo.create({
      userId,
      name,
      keyHash,
      prefix,
      scopes,
      expiresAt,
    });
    const saved = await this.repo.save(entity);
    return {
      id: saved.id,
      name: saved.name,
      prefix: saved.prefix,
      scopes: saved.scopes,
      key: rawKey,
      createdAt: saved.createdAt,
    };
  }

  async findByUser(userId: string) {
    return this.repo.find({
      where: { userId, isActive: true },
      select: [
        'id',
        'name',
        'prefix',
        'scopes',
        'lastUsedAt',
        'expiresAt',
        'createdAt',
      ],
    });
  }

  async revoke(id: string, userId: string) {
    const key = await this.repo.findOne({ where: { id, userId } });
    if (!key) throw new NotFoundException('API key not found');
    key.isActive = false;
    await this.repo.save(key);
    return { message: 'API key revoked' };
  }
}
