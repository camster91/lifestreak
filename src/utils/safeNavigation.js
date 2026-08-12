/**
 * Restrict navigation targets to same-origin relative paths.
 * Prevents open-redirect / phishing via SW messages or notification data.
 *
 * @param {unknown} url
 * @param {string} [origin]
 * @returns {string} Safe path beginning with `/` (defaults to `/`)
 */
export function sanitizeSameOriginPath(url, origin = globalThis.location?.origin) {
  if (typeof url !== 'string' || !url.trim()) return '/';

  const trimmed = url.trim();

  // Reject dangerous schemes and protocol-relative URLs early
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('blob:') ||
    trimmed.startsWith('//')
  ) {
    return '/';
  }

  // Prefer relative app paths
  if (trimmed.startsWith('/')) {
    // Block path tricks that embed a host: "/\\evil.com" or "/http://..."
    if (trimmed.includes('://') || trimmed.includes('\\')) return '/';
    return trimmed;
  }

  if (!origin) return '/';

  try {
    const parsed = new URL(trimmed, origin);
    if (parsed.origin !== origin) return '/';
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
  } catch {
    return '/';
  }
}

/** Allowed hosts for user-configured AI / Ollama base URLs (prevents key exfiltration). */
const ALLOWED_OLLAMA_HOSTS = new Set(['ollama.com', 'localhost', '127.0.0.1', '[::1]']);

/** External https hosts the app may open (JW.org resources + first-party). */
const ALLOWED_EXTERNAL_HOST_SUFFIXES = ['jw.org', 'ashbi.ca', 'ollama.com'];

/**
 * @param {string} hostname
 * @param {string} suffix
 */
function hostMatchesSuffix(hostname, suffix) {
  const host = hostname.toLowerCase();
  return host === suffix || host.endsWith(`.${suffix}`);
}

/**
 * Validate http(s) URLs before opening in browser / window.open.
 * Blocks javascript:/data: and non-allowlisted hosts.
 *
 * @param {unknown} url
 * @returns {{ ok: true, href: string } | { ok: false, reason: string }}
 */
export function validateExternalUrl(url) {
  if (typeof url !== 'string' || !url.trim()) {
    return { ok: false, reason: 'URL is required' };
  }

  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('blob:') ||
    trimmed.startsWith('//')
  ) {
    return { ok: false, reason: 'Blocked URL scheme' };
  }

  let parsed;
  try {
    parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, reason: 'Invalid URL' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: 'Only http(s) URLs are allowed' };
  }

  // Require HTTPS for remote hosts
  const host = parsed.hostname.toLowerCase();
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  if (!isLocal && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Remote URLs must use HTTPS' };
  }

  const allowed = ALLOWED_EXTERNAL_HOST_SUFFIXES.some((suffix) => hostMatchesSuffix(host, suffix));
  if (!allowed && !isLocal) {
    return { ok: false, reason: 'Host is not in the allowed list' };
  }

  return { ok: true, href: parsed.href };
}

/**
 * @param {unknown} baseUrl
 * @returns {{ ok: true, url: URL } | { ok: false, reason: string }}
 */
export function validateOllamaBaseUrl(baseUrl) {
  if (typeof baseUrl !== 'string' || !baseUrl.trim()) {
    return { ok: false, reason: 'Base URL is required' };
  }

  let parsed;
  try {
    parsed = new URL(baseUrl.trim());
  } catch {
    return { ok: false, reason: 'Invalid URL' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: 'Only http(s) URLs are allowed' };
  }

  // Local Ollama may use http; cloud must use https
  const host = parsed.hostname.toLowerCase();
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  if (!isLocal && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Remote AI hosts must use HTTPS' };
  }

  if (!ALLOWED_OLLAMA_HOSTS.has(host)) {
    return { ok: false, reason: 'Host is not in the allowed list' };
  }

  return { ok: true, url: parsed };
}
