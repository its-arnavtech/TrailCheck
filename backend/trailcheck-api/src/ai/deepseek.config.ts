export const DEEPSEEK_CHAT_COMPLETIONS_URL =
  'https://api.deepseek.com/chat/completions';

/**
 * Canonical API id for DeepSeek V4.1 Flash (the current V4 Flash model).
 * The retired ids `deepseek-v4-flash` and `deepseek-v4-flash-vision-exp`
 * still route to this model, but new calls should use `deepseek-flash`.
 */
export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-flash';

export const DEFAULT_DEEPSEEK_MAX_OUTPUT_TOKENS = 256;
export const DEEPSEEK_MAX_OUTPUT_TOKENS_CEILING = 384;
export const DEFAULT_DEEPSEEK_DAILY_LIMIT = 100;
export const DEFAULT_AI_RATE_LIMIT = 20;
export const DEFAULT_AI_RATE_LIMIT_TTL_SECONDS = 60;

const PLACEHOLDER_KEYS = new Set([
  'your-deepseek-api-key',
  'changeme',
  'replace-me',
  'replace-with-your-deepseek-api-key',
]);

let clock: () => Date = () => new Date();

export function currentDate(): Date {
  return clock();
}

/** Test hook. Pass null to restore the real clock. */
export function setCurrentDateForTests(next: (() => Date) | null): void {
  clock = next ?? (() => new Date());
}

export function isUsableDeepseekApiKey(
  value: string | undefined | null,
): boolean {
  const apiKey = value?.trim() ?? '';
  if (!apiKey) {
    return false;
  }

  return !PLACEHOLDER_KEYS.has(apiKey.toLowerCase());
}

export function clampMaxOutputTokens(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_DEEPSEEK_MAX_OUTPUT_TOKENS;
  }

  return Math.min(Math.floor(value), DEEPSEEK_MAX_OUTPUT_TOKENS_CEILING);
}

export function redactSecret(
  message: string,
  secret: string | undefined | null,
): string {
  const trimmed = secret?.trim() ?? '';
  if (trimmed.length < 6 || !message.includes(trimmed)) {
    return message;
  }

  return message.split(trimmed).join('[redacted]');
}

export function utcDayStamp(now = currentDate()): string {
  return now.toISOString().slice(0, 10);
}

/** One digest per park, its trail slugs, and UTC day. */
export function buildDigestCacheKey(
  parkSlug: string,
  trailSlugs: readonly string[],
  now = currentDate(),
): string {
  const trails = [
    ...new Set(trailSlugs.map((slug) => slug.trim()).filter(Boolean)),
  ]
    .sort()
    .join(',');

  return `${utcDayStamp(now)}:${parkSlug}:${trails || 'park'}`;
}
