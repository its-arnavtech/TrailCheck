import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const forwardedFor = String(req.headers?.['x-forwarded-for'] ?? '')
      .split(',')[0]
      .trim();

    return (
      forwardedFor ||
      req.ip ||
      req.ips?.[0] ||
      req.socket?.remoteAddress ||
      'unknown-client'
    );
  }

  protected async getErrorMessage(
    _context: ExecutionContext,
  ): Promise<string> {
    return 'Too many requests. Please slow down and try again shortly.';
  }
}
