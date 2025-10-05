/* eslint-disable prettier/prettier */
import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ApiKeysService } from '../api-key.service';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) throw new ForbiddenException('Missing API key');

    const company = await this.apiKeysService.validateKey(apiKey);
    (req as any).company = company;
    next();
  }
}
