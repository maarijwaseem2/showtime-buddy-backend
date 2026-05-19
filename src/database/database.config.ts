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

function isDeployedEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.RENDER) ||
    Boolean(process.env.VERCEL)
  );
}

function assertProductionDatabaseHost(host: string): void {
  if (!isDeployedEnvironment()) return;
  if (!LOCAL_DB_HOSTS.has(host)) return;
  throw new Error(
    'Refusing localhost for PostgreSQL on Render/production. Delete DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME from Render → Environment. Add only DATABASE_URL with your Neon connection string, then redeploy.',
  );
}

function assertRenderDatabaseConfig(
  get: (key: string, defaultValue?: string) => string | undefined,
): void {
  if (!process.env.RENDER) return;
  if (get('DATABASE_URL')) return;
  if (get('DATABASE_HOST') || get('DATABASE_NAME')) {
    throw new Error(
      `Render is using local DB vars (host=${get('DATABASE_HOST') ?? '?'}, db=${get('DATABASE_NAME') ?? '?'}) but DATABASE_URL is missing. In Render → Environment: remove DATABASE_HOST/PORT/USER/PASSWORD/NAME and add DATABASE_URL=your Neon URL.`,
    );
  }
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
  assertRenderDatabaseConfig(get);

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
