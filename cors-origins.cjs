/**
 * Shared CORS allowlist for API / dev servers.
 * Prefer ALLOWED_ORIGINS env (comma-separated) over hardcoding product hosts.
 */

const DEFAULT_PRODUCTION_ORIGINS = [
  'https://ashbi.ca',
  'https://www.ashbi.ca',
  'https://lifestreak.ashbi.ca',
];

const CAPACITOR_ORIGINS = [
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'https://localhost',
];

const LOCAL_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:3009',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3009',
];

function parseEnvOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getAllowedOrigins({ includeLocalDev = false } = {}) {
  const origins = new Set([
    ...DEFAULT_PRODUCTION_ORIGINS,
    ...CAPACITOR_ORIGINS,
    ...parseEnvOrigins(),
  ]);

  if (includeLocalDev || process.env.NODE_ENV !== 'production') {
    LOCAL_DEV_ORIGINS.forEach((o) => origins.add(o));
  }

  return origins;
}

/**
 * @param {string | undefined} origin
 * @param {{ allowMissingOrigin?: boolean, includeLocalDev?: boolean }} [options]
 */
function isOriginAllowed(origin, options = {}) {
  const { allowMissingOrigin = false, includeLocalDev = process.env.NODE_ENV !== 'production' } =
    options;

  // Missing Origin is typical for same-origin navigations, curl, and some native clients.
  // Only allow when explicitly opted in (e.g. health checks / non-prod).
  if (!origin) return allowMissingOrigin;

  return getAllowedOrigins({ includeLocalDev }).has(origin);
}

/**
 * Express/cors-compatible origin callback.
 * Production: reject missing Origin (except when allowMissingOrigin is true).
 */
function createCorsOriginDelegate(options = {}) {
  const allowMissingOrigin =
    options.allowMissingOrigin ?? process.env.NODE_ENV !== 'production';
  const includeLocalDev =
    options.includeLocalDev ?? process.env.NODE_ENV !== 'production';

  return function corsOrigin(origin, callback) {
    if (isOriginAllowed(origin, { allowMissingOrigin, includeLocalDev })) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  };
}

module.exports = {
  getAllowedOrigins,
  isOriginAllowed,
  createCorsOriginDelegate,
  DEFAULT_PRODUCTION_ORIGINS,
};
