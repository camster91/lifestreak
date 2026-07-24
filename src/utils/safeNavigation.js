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
