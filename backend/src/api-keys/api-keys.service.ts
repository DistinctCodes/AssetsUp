import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, createHash } from 'crypto';
import { Repository } from 'typeorm';
import { ApiKey } from './api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { User } from '../users/user.entity';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeysRepo: Repository<ApiKey>,
  ) {}

  async create(owner: User, dto: CreateApiKeyDto) {
    const rawKey = `ask_${randomBytes(20).toString('hex')}`;
    const apiKey = this.apiKeysRepo.create({
      name: dto.name,
      keyHash: this.hash(rawKey),
      prefix: rawKey.slice(0, 8),
      owner,
      ownerId: owner.id,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      lastUsedAt: null,
      revokedAt: null,
    });

    const saved = await this.apiKeysRepo.save(apiKey);
    return {
      id: saved.id,
      name: saved.name,
      prefix: saved.prefix,
      expiresAt: saved.expiresAt,
      createdAt: saved.createdAt,
      key: rawKey,
    };
  }

  async findOwn(ownerId: string) {
    const keys = await this.apiKeysRepo.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });

    return keys.map(({ id, name, prefix, lastUsedAt, expiresAt, createdAt, revokedAt }) => ({
      id,
      name,
      prefix,
      lastUsedAt,
      expiresAt,
      createdAt,
      revokedAt,
    }));
  }

  async revoke(ownerId: string, id: string): Promise<void> {
    const apiKey = await this.apiKeysRepo.findOne({ where: { id, ownerId } });
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    apiKey.revokedAt = new Date();
    await this.apiKeysRepo.save(apiKey);
  }

  async authenticateHeader(headerValue: string | string[] | undefined) {
    const rawKey = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!rawKey) {
      return null;
    }

    const apiKey = await this.apiKeysRepo.findOne({
      where: { keyHash: this.hash(rawKey) },
      relations: ['owner'],
    });

    if (!apiKey) {
      return null;
    }

    if (apiKey.revokedAt || (apiKey.expiresAt && apiKey.expiresAt <= new Date())) {
      throw new UnauthorizedException('API key is expired or revoked');
    }

    apiKey.lastUsedAt = new Date();
    await this.apiKeysRepo.save(apiKey);
    return apiKey.owner;
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
