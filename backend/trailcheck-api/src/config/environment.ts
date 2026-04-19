const DEFAULT_DEV_FRONTEND_ORIGIN = 'http://localhost:3000';
const POSTGRES_PROTOCOLS = ['postgres://', 'postgresql://'];
const PASSWORD_RESET_EMAIL_PROVIDERS = ['disabled', 'resend'] as const;

function parseAllowedOrigins(value?: string) {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
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
  const nodeEnv = String(config.NODE_ENV ?? 'development');
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

  const jwtSecret = String(config.JWT_SECRET);
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long.');
  }

  if (isProduction && frontendOrigins.length === 0) {
    throw new Error(
      'FRONTEND_ORIGIN must be set in production. Use a comma-separated allowlist when needed.',
    );
  }

  if (isProduction && String(config.DATABASE_URL).startsWith('file:')) {
    throw new Error(
      'Production deployments should use a managed database instead of a local SQLite file.',
    );
  }

  if (
    isProduction &&
    !POSTGRES_PROTOCOLS.some((protocol) =>
      String(config.DATABASE_URL).startsWith(protocol),
    )
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
  if (
    passwordResetTokenTtlMinutes < 15 ||
    passwordResetTokenTtlMinutes > 60
  ) {
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

  const passwordResetEmailProvider = String(
    config.PASSWORD_RESET_EMAIL_PROVIDER ?? 'disabled',
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
  };
}

export function getAllowedOrigins(frontendOrigin: string) {
  return parseAllowedOrigins(frontendOrigin);
}
