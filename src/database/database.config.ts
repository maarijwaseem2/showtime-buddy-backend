import { ConfigService } from '@nestjs/config';
import type { TlsOptions } from 'tls';

export type PostgresConnectionOptions = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: TlsOptions | boolean;
};

function resolveSsl(
  databaseSsl?: string,
  urlSslMode?: string | null,
): TlsOptions | boolean | undefined {
  if (
    databaseSsl === 'true' ||
    urlSslMode === 'require' ||
    urlSslMode === 'verify-full'
  ) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

export function resolvePostgresConfig(
  get: (key: string, defaultValue?: string) => string | undefined,
): PostgresConnectionOptions {
  const databaseUrl = get('DATABASE_URL');
  if (databaseUrl) {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port || '5432', 10),
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ''),
      ssl: resolveSsl(get('DATABASE_SSL'), url.searchParams.get('sslmode')),
    };
  }

  const host = get('DATABASE_HOST');
  if (!host) {
    throw new Error(
      'Database not configured. On Render, link a PostgreSQL instance or set DATABASE_URL (or DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME).',
    );
  }

  return {
    host,
    port: parseInt(get('DATABASE_PORT', '5432')!, 10),
    username: get('DATABASE_USER', 'postgres')!,
    password: get('DATABASE_PASSWORD', '')!,
    database: get('DATABASE_NAME', 'cineslot')!,
    ssl: resolveSsl(get('DATABASE_SSL')),
  };
}

export function postgresConfigFromConfigService(
  config: ConfigService,
): PostgresConnectionOptions {
  return resolvePostgresConfig((key, defaultValue) => {
    const value = config.get<string>(key);
    return value ?? defaultValue;
  });
}

export function postgresConfigFromEnv(): PostgresConnectionOptions {
  return resolvePostgresConfig(
    (key, defaultValue) => process.env[key] ?? defaultValue,
  );
}
