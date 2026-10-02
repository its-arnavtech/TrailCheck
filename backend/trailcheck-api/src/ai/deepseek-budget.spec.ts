import { DeepseekDailyBudget } from './deepseek-budget';
import {
  buildDigestCacheKey,
  clampMaxOutputTokens,
  isUsableDeepseekApiKey,
  redactSecret,
} from './deepseek.config';

describe('DeepseekDailyBudget', () => {
  const day = new Date('2026-10-01T12:00:00.000Z');
  const nextDay = new Date('2026-10-02T00:00:00.000Z');

  it('allows calls until the configured limit, then refuses', () => {
    const budget = new DeepseekDailyBudget(2);

    expect(budget.tryConsume(day)).toBe(true);
    expect(budget.tryConsume(day)).toBe(true);
    expect(budget.tryConsume(day)).toBe(false);
    expect(budget.used(day)).toBe(2);
  });

  it('resets the counter on the next UTC day', () => {
    const budget = new DeepseekDailyBudget(1);

    expect(budget.tryConsume(day)).toBe(true);
    expect(budget.tryConsume(day)).toBe(false);
    expect(budget.tryConsume(nextDay)).toBe(true);
    expect(budget.used(day)).toBe(0);
    expect(budget.used(nextDay)).toBe(1);
  });

  it('treats a limit of zero as no DeepSeek calls', () => {
    const budget = new DeepseekDailyBudget(0);
    expect(budget.tryConsume(day)).toBe(false);
  });
});

describe('digest cache key', () => {
  it('includes the park, sorted trail slugs, and UTC day', () => {
    const now = new Date('2026-10-01T23:30:00.000Z');
    expect(
      buildDigestCacheKey('yosemite', ['mist-trail', 'valley-loop'], now),
    ).toBe('2026-10-01:yosemite:mist-trail,valley-loop');
    expect(
      buildDigestCacheKey('yosemite', ['valley-loop', 'mist-trail'], now),
    ).toBe('2026-10-01:yosemite:mist-trail,valley-loop');
  });
});

describe('DeepSeek key handling', () => {
  it('rejects blank and placeholder keys', () => {
    expect(isUsableDeepseekApiKey('')).toBe(false);
    expect(isUsableDeepseekApiKey('your-deepseek-api-key')).toBe(false);
    expect(isUsableDeepseekApiKey('changeme')).toBe(false);
    expect(isUsableDeepseekApiKey('test-deepseek-key')).toBe(true);
  });
});

describe('DeepSeek output guardrails', () => {
  it('caps max output tokens', () => {
    expect(clampMaxOutputTokens(256)).toBe(256);
    expect(clampMaxOutputTokens(5000)).toBe(384);
    expect(clampMaxOutputTokens(0)).toBe(256);
  });

  it('redacts the API key from error text', () => {
    expect(
      redactSecret('failed for sk-test-key-value', 'sk-test-key-value'),
    ).toBe('failed for [redacted]');
    expect(redactSecret('status 401', 'sk-test-key-value')).toBe('status 401');
  });
});
