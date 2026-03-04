import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from './entities/api-key.entity';
import { Request } from 'express';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
  ) {
    super();
  }

  async validate(req: Request) {
    const header = req.headers['x-api-key'] as string;
    if (!header) throw new UnauthorizedException('API key required');

    const apiKey = await this.apiKeyRepo.findOne({
      where: { key: header, isActive: true },
      relations: ['user'],
    });

    if (!apiKey) throw new UnauthorizedException('Invalid API key');
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key expired');
    }

    await this.apiKeyRepo.update(apiKey.id, { lastUsedAt: new Date() });

    return { id: apiKey.user.id, email: apiKey.user.email, name: apiKey.user.name };
  }
}
