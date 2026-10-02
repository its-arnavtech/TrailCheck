export class SlidingWindowRateLimit {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  allow(tracker: string, now = Date.now()): boolean {
    const recent = (this.hits.get(tracker) ?? []).filter(
      (timestamp) => now - timestamp < this.windowMs,
    );

    if (recent.length >= this.limit) {
      this.hits.set(tracker, recent);
      return false;
    }

    recent.push(now);
    this.hits.set(tracker, recent);
    return true;
  }
}

export function resolveAiClientTracker(input: {
  authorizationHeader?: string | string[];
  forwardedFor?: string | string[];
  ip?: string;
  userIdFromToken: (token: string) => number | null;
}): string {
  const authorization = firstHeader(input.authorizationHeader);
  const token = authorization?.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : '';

  if (token) {
    const userId = input.userIdFromToken(token);
    if (Number.isInteger(userId) && (userId ?? 0) > 0) {
      return `user:${userId}`;
    }
  }

  const forwarded = firstHeader(input.forwardedFor)?.split(',')[0]?.trim();
  const ip = forwarded || input.ip?.trim() || 'unknown-client';
  return `ip:${ip}`;
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}
