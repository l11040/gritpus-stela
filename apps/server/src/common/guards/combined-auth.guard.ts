import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiKeyAuthGuard } from './api-key-auth.guard';

@Injectable()
export class CombinedAuthGuard implements CanActivate {
  private jwtGuard = new JwtAuthGuard();
  private apiKeyGuard = new ApiKeyAuthGuard();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (request.headers['x-api-key']) {
      return this.apiKeyGuard.canActivate(context) as Promise<boolean>;
    }

    return this.jwtGuard.canActivate(context) as Promise<boolean>;
  }
}
