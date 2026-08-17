import { afterEach, describe, expect, it, vi } from 'vitest';

const originalStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');

function restoreLocalStorage() {
  if (originalStorageDescriptor) {
    Object.defineProperty(window, 'localStorage', originalStorageDescriptor);
  } else {
    delete window.localStorage;
  }
}

function simpleHabit() {
  return {
    name: 'Move',
    startDate: '2026-08-17',
    timeOfDay: 'afternoon',
    schedule: { type: 'daily', anchorDate: '2026-08-17' },
    tracking: { type: 'binary' },
  };
}

afterEach(() => {
  restoreLocalStorage();
  vi.resetModules();
});

describe('habit storage failures', () => {
  it('loads a recoverable error state when localStorage access is blocked', async () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
    vi.resetModules();

    const { habitStore } = await import('./store');

    expect(habitStore.getSnapshot().habits).toEqual([]);
    expect(habitStore.getSnapshot().operation?.type).toBe('error');
    expect(habitStore.getSnapshot().operation?.message).toMatch(/storage is unavailable/i);
  });

  it('does not publish a habit when persistence fails', async () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(() => null),
      length: 0,
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });
    vi.resetModules();

    const { habitStore } = await import('./store');
    const habitId = habitStore.createHabit(simpleHabit());

    expect(habitId).toBeNull();
    expect(habitStore.getSnapshot().habits).toEqual([]);
    expect(habitStore.getSnapshot().operation?.type).toBe('error');
    expect(habitStore.getSnapshot().operation?.message).toMatch(/nothing was saved/i);
  });
});
