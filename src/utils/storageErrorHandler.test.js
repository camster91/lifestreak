import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  STORAGE_STATUS_EVENT,
  clearStorageRecoveryForTests,
  createSafeStorage,
  exportStorageRecovery,
  getStorageRecovery,
  retryStorageWrite,
} from './storageErrorHandler';

describe('safe storage recovery', () => {
  beforeEach(() => clearStorageRecoveryForTests());

  it('never deletes unrelated data when a quota write fails', () => {
    const status = vi.fn();
    window.addEventListener(STORAGE_STATUS_EVENT, status);
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });

    createSafeStorage('ls-reading-storage').setItem('ls-reading-storage', '{"state":{}}');

    expect(localStorage.removeItem).not.toHaveBeenCalled();
    expect(getStorageRecovery('ls-reading-storage')).toMatchObject({ operation: 'write' });
    expect(exportStorageRecovery('ls-reading-storage')).toContain('{\\"state\\":{}}');
    expect(status).toHaveBeenCalledOnce();
    window.removeEventListener(STORAGE_STATUS_EVENT, status);
  });

  it('retries and verifies a pending write', () => {
    vi.mocked(localStorage.setItem).mockImplementationOnce(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const storage = createSafeStorage('ls-service-storage');
    storage.setItem('ls-service-storage', '{"state":{"entries":[]}}');

    expect(retryStorageWrite('ls-service-storage')).toBe(true);
    expect(getStorageRecovery('ls-service-storage')).toBeNull();
  });

  it('keeps malformed JSON at its original key and exposes a recovery export', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('{broken');
    const value = createSafeStorage('ls-reading-storage').getItem('ls-reading-storage');

    expect(value).toBeNull();
    expect(localStorage.removeItem).not.toHaveBeenCalled();
    expect(exportStorageRecovery('ls-reading-storage')).toContain('{broken');
  });

  it('reports disabled storage without throwing away in-memory work', () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    expect(() =>
      createSafeStorage('ls-service-storage').setItem('ls-service-storage', '{"state":{}}')
    ).not.toThrow();
    expect(getStorageRecovery('ls-service-storage')).toMatchObject({ operation: 'write' });
  });
});
