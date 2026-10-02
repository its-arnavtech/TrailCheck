import { HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AiRateLimitGuard } from './ai-rate-limit.guard';
import {
  resolveAiClientTracker,
  SlidingWindowRateLimit,
} from './ai-rate-limit';

const SECRET = 'test-secret-test-secret-test-secret';

describe('SlidingWindowRateLimit', () => {
  it('blocks a tracker after the limit inside the window', () => {
    const limiter = new SlidingWindowRateLimit(2, 60_000);
    const now = 1_000_000;

    expect(limiter.allow('ip:1.1.1.1', now)).toBe(true);
    expect(limiter.allow('ip:1.1.1.1', now + 10)).toBe(true);
    expect(limiter.allow('ip:1.1.1.1', now + 20)).toBe(false);
    expect(limiter.allow('ip:2.2.2.2', now + 20)).toBe(true);
  });

  it('allows the tracker again after the window expires', () => {
    const limiter = new SlidingWindowRateLimit(1, 1_000);
    expect(limiter.allow('user:4', 0)).toBe(true);
    expect(limiter.allow('user:4', 500)).toBe(false);
    expect(limiter.allow('user:4', 1_000)).toBe(true);
  });
});

describe('resolveAiClientTracker', () => {
  it('uses a verified user id ahead of the IP', () => {
    expect(
      resolveAiClientTracker({
        authorizationHeader: 'Bearer token',
        forwardedFor: '8.8.8.8, 1.1.1.1',
        ip: '10.0.0.5',
        userIdFromToken: () => 42,
      }),
    ).toBe('user:42');
  });

  it('uses the first forwarded IP when there is no valid user', () => {
    expect(
      resolveAiClientTracker({
        authorizationHeader: 'Bearer nope',
        forwardedFor: '8.8.8.8, 1.1.1.1',
        ip: '10.0.0.5',
        userIdFromToken: () => null,
      }),
    ).toBe('ip:8.8.8.8');
  });
});

describe('AiRateLimitGuard', () => {
  const jwt = new JwtService({ secret: SECRET });

  function guard(limit = 2) {
    return new AiRateLimitGuard({
      get: (key: string) => {
        if (key === 'AI_RATE_LIMIT') {
          return String(limit);
        }
        if (key === 'AI_RATE_LIMIT_TTL_SECONDS') {
          return '60';
        }
        if (key === 'JWT_SECRET') {
          return SECRET;
        }
        return undefined;
      },
    } as never);
  }

  function contextFor(request: Record<string, unknown>) {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as never;
  }

  it('limits anonymous clients by IP and signed-in clients by user id', () => {
    const rateLimit = guard(1);
    const token = jwt.sign({ sub: 7, email: 'visitor@example.com' });

    expect(
      rateLimit.canActivate(
        contextFor({
          headers: { 'x-forwarded-for': '203.0.113.8' },
          ip: '10.0.0.1',
        }),
      ),
    ).toBe(true);
    expect(() =>
      rateLimit.canActivate(
        contextFor({
          headers: { 'x-forwarded-for': '203.0.113.8' },
          ip: '10.0.0.1',
        }),
      ),
    ).toThrow(HttpException);

    expect(
      rateLimit.canActivate(
        contextFor({
          headers: {
            authorization: `Bearer ${token}`,
            'x-forwarded-for': '203.0.113.8',
          },
          ip: '10.0.0.1',
        }),
      ),
    ).toBe(true);
    expect(() =>
      rateLimit.canActivate(
        contextFor({
          headers: {
            authorization: `Bearer ${token}`,
            'x-forwarded-for': '198.51.100.4',
          },
          ip: '10.0.0.9',
        }),
      ),
    ).toThrow(HttpException);
  });

  it('falls back to the IP when the bearer token is not valid', () => {
    const rateLimit = guard(1);

    expect(
      rateLimit.canActivate(
        contextFor({
          headers: {
            authorization: 'Bearer not-a-jwt',
            'x-forwarded-for': '203.0.113.9',
          },
          ip: '10.0.0.2',
        }),
      ),
    ).toBe(true);
    expect(() =>
      rateLimit.canActivate(
        contextFor({
          headers: { 'x-forwarded-for': '203.0.113.9' },
          ip: '10.0.0.2',
        }),
      ),
    ).toThrow(HttpException);
  });
});
