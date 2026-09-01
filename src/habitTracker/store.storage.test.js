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
    expect(habitStore.getSnapshot().operation).toMatchObject({
      action: 'reload',
      dismissible: false,
    });
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

  it('does not report success when a storage adapter silently drops the write', async () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
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
    expect(habitStore.createHabit(simpleHabit())).toBeNull();
    expect(habitStore.getSnapshot().habits).toEqual([]);
    expect(habitStore.getSnapshot().operation?.message).toMatch(/nothing was saved/i);
  });

  it('retries the same rolled-back transaction after storage recovers', async () => {
    let storedValue = null;
    let storageFailed = true;
    const storage = {
      getItem: vi.fn(() => storedValue),
      setItem: vi.fn((_key, value) => {
        if (storageFailed) throw new DOMException('Quota exceeded', 'QuotaExceededError');
        storedValue = value;
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

    const { habitStore, HABIT_STORAGE_KEY } = await import('./store');
    expect(habitStore.createHabit(simpleHabit())).toBeNull();
    expect(habitStore.getSnapshot().operation).toMatchObject({
      type: 'error',
      retryable: true,
    });

    storageFailed = false;
    expect(habitStore.retryLastOperation()).toBe(true);
    expect(habitStore.getSnapshot().habits).toEqual([expect.objectContaining({ name: 'Move' })]);
    expect(JSON.parse(storage.getItem(HABIT_STORAGE_KEY)).habits).toHaveLength(1);
    expect(habitStore.getSnapshot().operation?.type).toBe('success');
  });

  it('preserves but refuses to load a structurally invalid v1 database', async () => {
    const corrupt = JSON.stringify({
      version: 1,
      habits: [
        {
          id: 'habit-1',
          name: 'Corrupt schedule fixture',
          description: '',
          category: 'Health',
          timeOfDay: 'afternoon',
          startDate: '2026-08-17',
          schedule: { type: 'daily', anchorDate: '2026-02-30' },
          tracking: { type: 'binary', target: 1, unit: 'completion' },
          lifecycleState: 'active',
          lifecycleHistory: [],
          revisions: [],
          createdAt: '2026-08-17T12:00:00.000Z',
          updatedAt: '2026-08-17T12:00:00.000Z',
        },
      ],
      logs: [],
      preferences: {},
      onboarding: {},
      legacy: {},
    });
    const storage = {
      getItem: vi.fn(() => corrupt),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(() => null),
      length: 1,
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });
    vi.resetModules();

    const { habitStore } = await import('./store');
    expect(habitStore.getSnapshot().habits).toEqual([]);
    expect(habitStore.getSnapshot().operation?.type).toBe('error');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.getItem()).toBe(corrupt);
  });

  it('persists a dismissal for its review week and not a later week', async () => {
    window.localStorage.clear();
    vi.resetModules();
    const { habitStore, HABIT_STORAGE_KEY } = await import('./store');
    const habitId = habitStore.createHabit(simpleHabit());

    expect(habitStore.dismissWeeklyReviewSuggestion(habitId, '2026-08-19')).toBe(true);
    expect(habitStore.getSnapshot().preferences.weeklyReviewDismissals).toEqual({
      '2026-08-17': [habitId],
    });

    const persisted = JSON.parse(window.localStorage.getItem(HABIT_STORAGE_KEY));
    expect(persisted.preferences.weeklyReviewDismissals['2026-08-17']).toEqual([habitId]);
    expect(persisted.preferences.weeklyReviewDismissals['2026-08-24']).toBeUndefined();

    vi.resetModules();
    const { habitStore: reloadedStore } = await import('./store');
    expect(reloadedStore.getSnapshot().preferences.weeklyReviewDismissals).toEqual({
      '2026-08-17': [habitId],
    });
  });
});
