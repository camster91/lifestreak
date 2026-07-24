import { describe, it, expect } from 'vitest';
import { sanitizeSameOriginPath, validateOllamaBaseUrl } from './safeNavigation.js';

describe('sanitizeSameOriginPath', () => {
  const origin = 'https://app.example.com';

  it('allows relative app paths', () => {
    expect(sanitizeSameOriginPath('/settings', origin)).toBe('/settings');
    expect(sanitizeSameOriginPath('/study?tab=1#top', origin)).toBe('/study?tab=1#top');
  });

  it('rejects external absolute URLs', () => {
    expect(sanitizeSameOriginPath('https://evil.example/phish', origin)).toBe('/');
  });

  it('rejects dangerous schemes and protocol-relative URLs', () => {
    expect(sanitizeSameOriginPath('javascript:alert(1)', origin)).toBe('/');
    expect(sanitizeSameOriginPath('data:text/html,hi', origin)).toBe('/');
    expect(sanitizeSameOriginPath('//evil.example/x', origin)).toBe('/');
  });

  it('allows same-origin absolute URLs as a path', () => {
    expect(sanitizeSameOriginPath('https://app.example.com/stats', origin)).toBe('/stats');
  });

  it('defaults empty/invalid to /', () => {
    expect(sanitizeSameOriginPath('', origin)).toBe('/');
    expect(sanitizeSameOriginPath(null, origin)).toBe('/');
  });
});

describe('validateOllamaBaseUrl', () => {
  it('allows ollama.com over https', () => {
    const result = validateOllamaBaseUrl('https://ollama.com');
    expect(result.ok).toBe(true);
  });

  it('allows localhost over http', () => {
    expect(validateOllamaBaseUrl('http://localhost:11434').ok).toBe(true);
    expect(validateOllamaBaseUrl('http://127.0.0.1:11434').ok).toBe(true);
  });

  it('rejects unknown hosts', () => {
    const result = validateOllamaBaseUrl('https://evil.example/api');
    expect(result.ok).toBe(false);
  });

  it('rejects remote http', () => {
    expect(validateOllamaBaseUrl('http://ollama.com').ok).toBe(false);
  });
});

describe('validateExternalUrl', () => {
  it('allows JW.org https links', async () => {
    const { validateExternalUrl } = await import('./safeNavigation.js');
    expect(validateExternalUrl('https://www.jw.org/en/library/').ok).toBe(true);
    expect(validateExternalUrl('wol.jw.org/en').ok).toBe(true);
  });

  it('rejects unknown hosts and dangerous schemes', async () => {
    const { validateExternalUrl } = await import('./safeNavigation.js');
    expect(validateExternalUrl('https://evil.example/phish').ok).toBe(false);
    expect(validateExternalUrl('javascript:alert(1)').ok).toBe(false);
  });
});
