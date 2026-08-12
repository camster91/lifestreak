import { describe, it, expect } from 'vitest';
import {
  validateBackupStoreData,
  validateLegacyBackup,
  MAX_BACKUP_BYTES,
} from './backupValidation.js';

describe('validateBackupStoreData', () => {
  it('accepts a valid settings + progress backup and strips api keys', () => {
    const result = validateBackupStoreData({
      'ls-progress-settings': {
        state: {
          theme: 'dark',
          ai: { provider: 'ollama', ollamaApiKey: 'SECRET', ollamaBaseUrl: 'https://ollama.com' },
        },
        version: 1,
      },
      'ls-progress-storage': {
        state: {
          dailyTexts: {},
          prayers: {},
        },
        version: 0,
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sanitized['ls-progress-settings'].state.ai.ollamaApiKey).toBe('');
    }
  });

  it('rejects unknown-only payloads', () => {
    const result = validateBackupStoreData({ evil: { state: {} } });
    expect(result.ok).toBe(false);
  });

  it('rejects invalid theme values', () => {
    const result = validateBackupStoreData({
      'ls-progress-settings': { state: { theme: 'neon' }, version: 1 },
    });
    expect(result.ok).toBe(false);
  });

  it('drops unrecognized keys but keeps valid ones', () => {
    const result = validateBackupStoreData({
      'ls-progress-storage': { state: { dailyTexts: {} } },
      __proto__: { admin: true },
      polluted: { x: 1 },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.sanitized)).toEqual(['ls-progress-storage']);
    }
  });
});

describe('validateLegacyBackup', () => {
  it('accepts progress/settings shape', () => {
    const result = validateLegacyBackup({
      progress: { dailyTexts: {}, prayers: {} },
      settings: { theme: 'light', ai: { ollamaApiKey: 'x' } },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sanitized.settings.ai.ollamaApiKey).toBe('');
    }
  });
});

describe('MAX_BACKUP_BYTES', () => {
  it('is a positive limit', () => {
    expect(MAX_BACKUP_BYTES).toBeGreaterThan(1024);
  });
});
