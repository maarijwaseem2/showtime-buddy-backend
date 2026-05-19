import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/** Hostnames always allowed in addition to CORS_ORIGINS (Vercel preview/production). */
const EXTRA_ALLOWED_HOST_SUFFIXES = ['.vercel.app', '.onrender.com'];

function isAllowedOrigin(origin: string, allowedOrigins: Set<string>): boolean {
  if (allowedOrigins.has(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    return EXTRA_ALLOWED_HOST_SUFFIXES.some(
      (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix),
    );
  } catch {
    return false;
  }
}

export function buildCorsOptions(corsOriginsEnv?: string): CorsOptions {
  const allowedOrigins = new Set(
    (corsOriginsEnv ?? 'http://localhost:8080')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  );

  return {
    origin: (origin, callback) => {
      // Same-origin tools, server-to-server, curl
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, isAllowedOrigin(origin, allowedOrigins));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  };
}
