import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  DEFAULT_AI_RATE_LIMIT,
  DEFAULT_AI_RATE_LIMIT_TTL_SECONDS,
} from './deepseek.config';
import {
  resolveAiClientTracker,
  SlidingWindowRateLimit,
} from './ai-rate-limit';

function readPositive(value: unknown, fallback: number): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  private readonly limiter: SlidingWindowRateLimit;
  private readonly jwt: JwtService;

  constructor(configService: ConfigService) {
    this.limiter = new SlidingWindowRateLimit(
      readPositive(configService.get('AI_RATE_LIMIT'), DEFAULT_AI_RATE_LIMIT),
      readPositive(
        configService.get('AI_RATE_LIMIT_TTL_SECONDS'),
        DEFAULT_AI_RATE_LIMIT_TTL_SECONDS,
      ) * 1000,
    );
    this.jwt = new JwtService({
      secret: configService.get<string>('JWT_SECRET') ?? '',
    });
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      ip?: string;
    }>();
    const tracker = resolveAiClientTracker({
      authorizationHeader: request.headers?.authorization,
      forwardedFor: request.headers?.['x-forwarded-for'],
      ip: request.ip,
      userIdFromToken: (token) => this.readUserId(token),
    });

    if (!this.limiter.allow(tracker)) {
      throw new HttpException(
        'Too many AI requests. Please wait a minute and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private readUserId(token: string): number | null {
    try {
      const payload = this.jwt.verify<{ sub?: unknown }>(token);
      return typeof payload.sub === 'number' ? payload.sub : null;
    } catch {
      return null;
    }
  }
}
