const DEFAULT_DEV_FRONTEND_ORIGIN = 'http://localhost:3000';

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
  };
}

export function getAllowedOrigins(frontendOrigin: string) {
  return parseAllowedOrigins(frontendOrigin);
}
