/* global __LIFESTREAK_VERSION__, __LIFESTREAK_REVISION__ */

export const DIAGNOSTICS_KEY = 'ls-error-logs';
export const DIAGNOSTICS_SCHEMA_VERSION = 1;
export const DIAGNOSTICS_RETENTION_DAYS = 30;
export const DIAGNOSTICS_MAX_RECORDS = 20;

const KNOWN_ROUTES = new Set([
  '/',
  '/goals',
  '/reading',
  '/service',
  '/settings',
  '/share',
  '/stats',
  '/study',
]);

function hash(value) {
  let result = 2166136261;
  for (const character of String(value || '')) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, '0');
}

function platform() {
  if (typeof window !== 'undefined' && window.Capacitor?.getPlatform) {
    const value = window.Capacitor.getPlatform();
    if (['android', 'ios', 'web'].includes(value)) return value;
  }
  return 'web';
}

function fixedRoute() {
  if (typeof window === 'undefined') return 'unknown';
  return KNOWN_ROUTES.has(window.location.pathname) ? window.location.pathname : 'other';
}

function supportedKind(kind) {
  return ['uncaught_exception', 'unhandled_rejection', 'react_boundary', 'native_init'].includes(
    kind
  )
    ? kind
    : 'uncaught_exception';
}

function readRecords(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(DIAGNOSTICS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(sanitizeRecord).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function sanitizeRecord(item) {
  if (
    !item ||
    item.schemaVersion !== DIAGNOSTICS_SCHEMA_VERSION ||
    typeof item.recordedAt !== 'string' ||
    !Number.isFinite(Date.parse(item.recordedAt)) ||
    typeof item.kind !== 'string' ||
    typeof item.errorClass !== 'string' ||
    typeof item.fingerprint !== 'string' ||
    typeof item.route !== 'string' ||
    typeof item.platform !== 'string' ||
    typeof item.appVersion !== 'string' ||
    typeof item.releaseRevision !== 'string'
  ) {
    return null;
  }
  return {
    schemaVersion: DIAGNOSTICS_SCHEMA_VERSION,
    recordedAt: item.recordedAt,
    kind: supportedKind(item.kind),
    errorClass: item.errorClass.slice(0, 80),
    fingerprint: item.fingerprint.slice(0, 80),
    route: KNOWN_ROUTES.has(item.route) ? item.route : 'other',
    platform: ['android', 'ios', 'web'].includes(item.platform) ? item.platform : 'web',
    appVersion: item.appVersion.slice(0, 40),
    releaseRevision: item.releaseRevision.slice(0, 80),
  };
}

export function recordDiagnostic(
  kind,
  error,
  {
    storage = globalThis.localStorage,
    now = new Date(),
    appVersion = typeof __LIFESTREAK_VERSION__ === 'string' ? __LIFESTREAK_VERSION__ : 'unknown',
    releaseRevision = typeof __LIFESTREAK_REVISION__ === 'string'
      ? __LIFESTREAK_REVISION__
      : 'unknown',
  } = {}
) {
  if (!storage?.getItem || !storage?.setItem) return null;
  const errorName = error instanceof Error ? error.name : typeof error;
  const normalizedKind = supportedKind(kind);
  const record = {
    schemaVersion: DIAGNOSTICS_SCHEMA_VERSION,
    recordedAt: now.toISOString(),
    kind: normalizedKind,
    errorClass: String(errorName || 'unknown').slice(0, 80),
    fingerprint: hash(`${normalizedKind}:${errorName || 'unknown'}`),
    route: fixedRoute(),
    platform: platform(),
    appVersion,
    releaseRevision,
  };
  try {
    const cutoff = now.getTime() - DIAGNOSTICS_RETENTION_DAYS * 86400000;
    const retained = readRecords(storage).filter(
      (item) =>
        item?.schemaVersion === DIAGNOSTICS_SCHEMA_VERSION && Date.parse(item.recordedAt) >= cutoff
    );
    storage.setItem(
      DIAGNOSTICS_KEY,
      JSON.stringify([...retained, record].slice(-DIAGNOSTICS_MAX_RECORDS))
    );
    return record;
  } catch {
    return null;
  }
}

export function createDiagnosticsExport(storage = globalThis.localStorage) {
  return {
    product: 'LifeStreak',
    diagnosticSchemaVersion: DIAGNOSTICS_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    privacy:
      'No habit, note, collection, quantitative value, raw error message, stack, URL query, or user-agent data is included.',
    records: readRecords(storage),
  };
}

export function clearDiagnostics(storage = globalThis.localStorage) {
  storage?.removeItem?.(DIAGNOSTICS_KEY);
}
