import { describe, expect, it } from 'vitest';
import {
  createPortableBackup,
  restorePortableBackup,
  validatePortableBackup,
} from './portableBackup.js';

function memoryStorage(initial = {}, failKey = null) {
  const values = new Map(Object.entries(initial));
  let pendingFailure = failKey;
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      if (key === pendingFailure) {
        pendingFailure = null;
        throw new Error('quota');
      }
      values.set(key, value);
    },
    removeItem: (key) => values.delete(key),
    values,
  };
}

const specialist = (theme = 'dark') =>
  JSON.stringify({ state: { theme, ai: { provider: 'none', ollamaApiKey: '' } }, version: 1 });

describe('portable LifeStreak backups', () => {
  it('exports recognized stores with schema metadata and redacted credentials', () => {
    const storage = memoryStorage({
      'ls-progress-settings': JSON.stringify({
        state: { theme: 'dark', ai: { provider: 'ollama', ollamaApiKey: 'secret' } },
        version: 1,
      }),
    });
    const backup = createPortableBackup(storage);
    expect(backup).toMatchObject({ product: 'LifeStreak', formatVersion: 1 });
    expect(backup.stores['ls-progress-settings'].state.ai.ollamaApiKey).toBe('');
  });

  it('rejects newer and partial-invalid backups before mutation', () => {
    const newer = {
      product: 'LifeStreak',
      formatVersion: 1,
      stores: { 'ls-progress-settings': { state: { theme: 'dark' }, version: 99 } },
    };
    expect(validatePortableBackup(newer)).toMatchObject({ ok: false });
  });

  it('writes a recovery snapshot and round-trips every validated store', () => {
    const storage = memoryStorage({
      'ls-progress-settings': specialist('light'),
      'ls-memories-storage': JSON.stringify({ state: { memories: [] }, version: 1 }),
    });
    const backup = {
      product: 'LifeStreak',
      formatVersion: 1,
      stores: {
        'ls-progress-settings': JSON.parse(specialist('dark')),
        'ls-progress-storage': { state: { dailyTexts: {}, prayers: {} }, version: 2 },
      },
    };
    const result = restorePortableBackup(backup, storage);
    expect(result.importedKeys).toEqual(['ls-progress-settings', 'ls-progress-storage']);
    expect(JSON.parse(storage.getItem('ls-progress-settings')).state.theme).toBe('dark');
    expect(JSON.parse(storage.getItem(result.recoveryKey)).rawStores['ls-progress-settings']).toBe(
      specialist('light')
    );
    expect(storage.getItem('ls-memories-storage')).toBeNull();
  });

  it('restores every original byte when any store write fails', () => {
    const originalSettings = specialist('light');
    const originalProgress = JSON.stringify({ state: { dailyTexts: {} }, version: 2 });
    const storage = memoryStorage(
      {
        'ls-progress-settings': originalSettings,
        'ls-progress-storage': originalProgress,
      },
      'ls-progress-storage'
    );
    const backup = {
      product: 'LifeStreak',
      formatVersion: 1,
      stores: {
        'ls-progress-settings': JSON.parse(specialist('dark')),
        'ls-progress-storage': { state: { dailyTexts: {}, prayers: {} }, version: 2 },
      },
    };
    expect(() => restorePortableBackup(backup, storage)).toThrow(
      /every original store was restored/
    );
    expect(storage.getItem('ls-progress-settings')).toBe(originalSettings);
    expect(storage.getItem('ls-progress-storage')).toBe(originalProgress);
  });
});
