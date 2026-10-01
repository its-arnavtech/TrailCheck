const DEFAULT_DEV_FRONTEND_ORIGIN = 'http://localhost:3000';
const POSTGRES_PROTOCOLS = ['postgres://', 'postgresql://'];
const PASSWORD_RESET_EMAIL_PROVIDERS = ['disabled', 'resend'] as const;
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-flash';
const DEFAULT_DEEPSEEK_DAILY_LIMIT = 100;
const DEFAULT_DEEPSEEK_MAX_OUTPUT_TOKENS = 256;
const DEEPSEEK_MAX_OUTPUT_TOKENS_CEILING = 384;

function readString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return fallback;
}

function parseAllowedOrigins(value?: string) {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function normalizeNonNegativeInteger(
  value: string | undefined,
  fallback: number,
  name: string,
) {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  if (!/^\d+$/.test(value.trim())) {
    throw new Error(`${name} must be a non-negative integer.`);
  }

  return Number.parseInt(value.trim(), 10);
}

function normalizePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer but received "${value}".`);
  }

  return parsed;
}

function normalizeUrl(value: string | undefined, fallback: string) {
  const candidate = (value ?? fallback).trim();

  try {
    const url = new URL(candidate);
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new Error(`Expected a valid URL but received "${candidate}".`);
  }
}

export function validateEnvironment(config: Record<string, unknown>) {
  const nodeEnv = readString(config.NODE_ENV, 'development');
  const isProduction = nodeEnv === 'production';
  const frontendOrigins = parseAllowedOrigins(
    typeof config.FRONTEND_ORIGIN === 'string'
      ? config.FRONTEND_ORIGIN
      : undefined,
  );

  if (!config.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }

  if (!config.JWT_SECRET) {
    throw new Error('JWT_SECRET is required.');
  }

  const jwtSecret = readString(config.JWT_SECRET);
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long.');
  }

  if (isProduction && frontendOrigins.length === 0) {
    throw new Error(
      'FRONTEND_ORIGIN must be set in production. Use a comma-separated allowlist when needed.',
    );
  }

  const databaseUrl = readString(config.DATABASE_URL);

  if (isProduction && databaseUrl.startsWith('file:')) {
    throw new Error(
      'Production deployments should use a managed database instead of a local SQLite file.',
    );
  }

  if (
    isProduction &&
    !POSTGRES_PROTOCOLS.some((protocol) => databaseUrl.startsWith(protocol))
  ) {
    throw new Error(
      'Production deployments must use a PostgreSQL DATABASE_URL.',
    );
  }

  const passwordResetTokenTtlMinutes = normalizePositiveInteger(
    typeof config.PASSWORD_RESET_TOKEN_TTL_MINUTES === 'string'
      ? config.PASSWORD_RESET_TOKEN_TTL_MINUTES
      : undefined,
    30,
  );
  if (passwordResetTokenTtlMinutes < 15 || passwordResetTokenTtlMinutes > 60) {
    throw new Error(
      'PASSWORD_RESET_TOKEN_TTL_MINUTES must be between 15 and 60 minutes.',
    );
  }

  const passwordResetMinResponseMs = normalizePositiveInteger(
    typeof config.PASSWORD_RESET_MIN_RESPONSE_MS === 'string'
      ? config.PASSWORD_RESET_MIN_RESPONSE_MS
      : undefined,
    350,
  );

  const passwordResetEmailProvider = readString(
    config.PASSWORD_RESET_EMAIL_PROVIDER,
    'disabled',
  ).toLowerCase();

  if (
    !PASSWORD_RESET_EMAIL_PROVIDERS.includes(
      passwordResetEmailProvider as (typeof PASSWORD_RESET_EMAIL_PROVIDERS)[number],
    )
  ) {
    throw new Error(
      'PASSWORD_RESET_EMAIL_PROVIDER must be one of: disabled, resend.',
    );
  }

  const frontendBaseUrl = normalizeUrl(
    typeof config.FRONTEND_BASE_URL === 'string'
      ? config.FRONTEND_BASE_URL
      : frontendOrigins[0],
    DEFAULT_DEV_FRONTEND_ORIGIN,
  );

  const mailFromAddress =
    typeof config.MAIL_FROM_ADDRESS === 'string'
      ? config.MAIL_FROM_ADDRESS.trim()
      : '';
  const resendApiKey =
    typeof config.RESEND_API_KEY === 'string'
      ? config.RESEND_API_KEY.trim()
      : '';

  if (passwordResetEmailProvider === 'resend') {
    if (!mailFromAddress) {
      throw new Error(
        'MAIL_FROM_ADDRESS is required when PASSWORD_RESET_EMAIL_PROVIDER=resend.',
      );
    }

    if (!resendApiKey) {
      throw new Error(
        'RESEND_API_KEY is required when PASSWORD_RESET_EMAIL_PROVIDER=resend.',
      );
    }
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    PORT: normalizePositiveInteger(
      typeof config.PORT === 'string' ? config.PORT : undefined,
      3001,
    ),
    FRONTEND_ORIGIN:
      frontendOrigins.length > 0
        ? frontendOrigins.join(',')
        : DEFAULT_DEV_FRONTEND_ORIGIN,
    RATE_LIMIT_TTL: normalizePositiveInteger(
      typeof config.RATE_LIMIT_TTL === 'string'
        ? config.RATE_LIMIT_TTL
        : typeof config.THROTTLE_TTL_SECONDS === 'string'
          ? config.THROTTLE_TTL_SECONDS
          : undefined,
      60,
    ),
    RATE_LIMIT_LIMIT: normalizePositiveInteger(
      typeof config.RATE_LIMIT_LIMIT === 'string'
        ? config.RATE_LIMIT_LIMIT
        : typeof config.THROTTLE_LIMIT === 'string'
          ? config.THROTTLE_LIMIT
          : undefined,
      100,
    ),
    THROTTLE_TTL_SECONDS: normalizePositiveInteger(
      typeof config.THROTTLE_TTL_SECONDS === 'string'
        ? config.THROTTLE_TTL_SECONDS
        : undefined,
      60,
    ),
    THROTTLE_LIMIT: normalizePositiveInteger(
      typeof config.THROTTLE_LIMIT === 'string'
        ? config.THROTTLE_LIMIT
        : undefined,
      120,
    ),
    FRONTEND_BASE_URL: frontendBaseUrl,
    PASSWORD_RESET_TOKEN_TTL_MINUTES: passwordResetTokenTtlMinutes,
    PASSWORD_RESET_MIN_RESPONSE_MS: passwordResetMinResponseMs,
    PASSWORD_RESET_EMAIL_PROVIDER: passwordResetEmailProvider,
    MAIL_FROM_ADDRESS: mailFromAddress,
    RESEND_API_KEY: resendApiKey,
    DEEPSEEK_MODEL:
      typeof config.DEEPSEEK_MODEL === 'string' && config.DEEPSEEK_MODEL.trim()
        ? config.DEEPSEEK_MODEL.trim()
        : DEFAULT_DEEPSEEK_MODEL,
    DEEPSEEK_DAILY_LIMIT: normalizeNonNegativeInteger(
      typeof config.DEEPSEEK_DAILY_LIMIT === 'string'
        ? config.DEEPSEEK_DAILY_LIMIT
        : undefined,
      DEFAULT_DEEPSEEK_DAILY_LIMIT,
      'DEEPSEEK_DAILY_LIMIT',
    ),
    DEEPSEEK_MAX_OUTPUT_TOKENS: Math.min(
      normalizeNonNegativeInteger(
        typeof config.DEEPSEEK_MAX_OUTPUT_TOKENS === 'string'
          ? config.DEEPSEEK_MAX_OUTPUT_TOKENS
          : undefined,
        DEFAULT_DEEPSEEK_MAX_OUTPUT_TOKENS,
        'DEEPSEEK_MAX_OUTPUT_TOKENS',
      ) || DEFAULT_DEEPSEEK_MAX_OUTPUT_TOKENS,
      DEEPSEEK_MAX_OUTPUT_TOKENS_CEILING,
    ),
    AI_RATE_LIMIT: normalizePositiveInteger(
      typeof config.AI_RATE_LIMIT === 'string'
        ? config.AI_RATE_LIMIT
        : undefined,
      20,
    ),
    AI_RATE_LIMIT_TTL_SECONDS: normalizePositiveInteger(
      typeof config.AI_RATE_LIMIT_TTL_SECONDS === 'string'
        ? config.AI_RATE_LIMIT_TTL_SECONDS
        : undefined,
      60,
    ),
  };
}

export function getAllowedOrigins(frontendOrigin: string) {
  return parseAllowedOrigins(frontendOrigin);
}
