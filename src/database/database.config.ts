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

const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

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

function assertProductionDatabaseHost(host: string): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (!LOCAL_DB_HOSTS.has(host)) return;
  throw new Error(
    'Refusing to use localhost for PostgreSQL in production. In Render → Environment, set DATABASE_URL to your Neon URL and remove DATABASE_HOST / DATABASE_PORT / DATABASE_USER / DATABASE_PASSWORD / DATABASE_NAME if they point to localhost.',
  );
}

function parseDatabaseUrl(
  databaseUrl: string,
  get: (key: string, defaultValue?: string) => string | undefined,
): PostgresConnectionOptions {
  const url = new URL(databaseUrl);
  const host = url.hostname;
  assertProductionDatabaseHost(host);
  return {
    host,
    port: parseInt(url.port || '5432', 10),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    ssl: resolveSsl(get('DATABASE_SSL'), url.searchParams.get('sslmode')),
  };
}

export function resolvePostgresConfig(
  get: (key: string, defaultValue?: string) => string | undefined,
): PostgresConnectionOptions {
  const databaseUrl = get('DATABASE_URL');
  if (databaseUrl) {
    return parseDatabaseUrl(databaseUrl, get);
  }

  const host = get('DATABASE_HOST');
  if (!host) {
    const onRender = Boolean(process.env.RENDER);
    throw new Error(
      onRender
        ? 'DATABASE_URL is not set on Render. Open your Web Service → Environment → Add Variable → DATABASE_URL = your Neon connection string, then redeploy. (Local .env files are not uploaded to Render.)'
        : 'Database not configured. Set DATABASE_URL or DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, and DATABASE_NAME.',
    );
  }

  assertProductionDatabaseHost(host);

  return {
    host,
    port: parseInt(get('DATABASE_PORT', '5432')!, 10),
    username: get('DATABASE_USER', 'postgres')!,
    password: get('DATABASE_PASSWORD', '')!,
    database: get('DATABASE_NAME', 'cineslot')!,
    ssl: resolveSsl(get('DATABASE_SSL')),
  };
}

/** Read env vars from process.env first (Render/Vercel inject these at runtime). */
export function envGetter(
  config?: ConfigService,
): (key: string, defaultValue?: string) => string | undefined {
  return (key, defaultValue) => {
    const fromProcess = process.env[key];
    if (fromProcess !== undefined && fromProcess !== '') {
      return fromProcess;
    }
    if (config) {
      const fromConfig = config.get<string>(key);
      if (fromConfig !== undefined && fromConfig !== '') {
        return fromConfig;
      }
    }
    return defaultValue;
  };
}

export function postgresConfigFromConfigService(
  config: ConfigService,
): PostgresConnectionOptions {
  return resolvePostgresConfig(envGetter(config));
}

export function postgresConfigFromEnv(): PostgresConnectionOptions {
  return resolvePostgresConfig(
    (key, defaultValue) => process.env[key] ?? defaultValue,
  );
}
