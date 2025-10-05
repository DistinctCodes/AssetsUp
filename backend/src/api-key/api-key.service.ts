/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from './entities/api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RevokeApiKeyDto } from './dto/revoke-api-key.dto';
import { randomBytes } from 'crypto';
import { Company } from 'src/companies/entities/company.entity';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepo: Repository<ApiKey>,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
  ) {}

  private generateKey(): string {
    return `ASSETSUP_${randomBytes(32).toString('hex')}`;
  }

  async createKey(dto: CreateApiKeyDto): Promise<ApiKey> {
    const company = await this.companyRepo.findOne({ where: { id: Number(dto.companyId) } });
    if (!company) throw new NotFoundException('Company not found');

    const apiKey = this.apiKeyRepo.create({
      key: this.generateKey(),
      company,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
    });

    return await this.apiKeyRepo.save(apiKey);
  }

  async revokeKey(dto: RevokeApiKeyDto): Promise<ApiKey> {
    const key = await this.apiKeyRepo.findOne({ where: { id: dto.apiKeyId } });
    if (!key) throw new NotFoundException('API key not found');

    key.status = 'revoked';
    return await this.apiKeyRepo.save(key);
  }

  async validateKey(key: string): Promise<Company> {
    const apiKey = await this.apiKeyRepo.findOne({
      where: { key, status: 'active' },
      relations: ['company'],
    });

    if (!apiKey) throw new ForbiddenException('Invalid API key');
    if (apiKey.expiryDate && apiKey.expiryDate < new Date()) {
      throw new ForbiddenException('API key expired');
    }

    return apiKey.company;
  }

  async listKeys(companyId: string): Promise<ApiKey[]> {
    return this.apiKeyRepo.find({
      where: { company: { id: Number(companyId) } },
      order: { createdAt: 'DESC' },
    });
  }
}
