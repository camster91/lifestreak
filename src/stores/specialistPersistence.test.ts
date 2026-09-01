import { beforeEach, describe, expect, it, vi } from 'vitest';
import useGamificationStore from './gamificationStore';
import useGoalsStore from './goalsStore';
import useMemoriesStore from './memoriesStore';
import useProgressStore from './progressStore';
import useReadingStore from './readingStore';
import useServiceStore from './serviceStore';
import useSettingsStore from './settingsStore';
import {
  clearStorageRecoveryForTests,
  getStorageRecovery,
  retryStorageWrite,
} from '../utils/storageErrorHandler';

const READING_KEY = 'ls-reading-storage';
const SERVICE_KEY = 'ls-service-storage';

function expectJsonWrite(key: string) {
  const serialized = lastPersistedValue(key);
  expect(serialized).not.toBe('[object Object]');
  expect(() => JSON.parse(serialized)).not.toThrow();
  expect(JSON.parse(serialized)).toHaveProperty('state');
}

beforeEach(() => {
  clearStorageRecoveryForTests();
  useReadingStore.setState({ items: [], quarantinedItems: [] });
  useServiceStore.setState({
    entries: [],
    quarantinedEntries: [],
    weeklyGoal: 4,
    monthlyGoal: 16,
  });
});

function lastPersistedValue(key: string) {
  const call = vi
    .mocked(localStorage.setItem)
    .mock.calls.findLast(([storedKey]) => storedKey === key);
  expect(call).toBeDefined();
  return call?.[1] || '';
}

describe('specialist store persistence', () => {
  it('uses JSON persistence for every Zustand specialist store', () => {
    vi.clearAllMocks();
    useProgressStore.getState().markDailyTextRead('2026-08-28');
    expectJsonWrite('ls-progress-storage');

    vi.clearAllMocks();
    useSettingsStore.getState().setTheme('dark');
    expectJsonWrite('ls-progress-settings');

    vi.clearAllMocks();
    useGamificationStore.getState().addPoints(5);
    expectJsonWrite('ls-gamification-storage');

    vi.clearAllMocks();
    useGoalsStore.getState().addGoal({ title: 'Review the roadmap' });
    expectJsonWrite('ls-goals-storage');

    vi.clearAllMocks();
    useMemoriesStore.getState().saveReflection('2026-08-28', 'A private note');
    expectJsonWrite('ls-memories-storage');
  });

  it('writes reading state as versioned JSON and restores it', async () => {
    useReadingStore.getState().addItem({
      title: 'Local-first systems',
      type: 'book',
      totalUnits: 12,
      notes: 'Keep this private',
    });

    const serialized = lastPersistedValue(READING_KEY);
    const persisted = JSON.parse(serialized);
    expect(persisted).toMatchObject({
      state: {
        items: [
          {
            title: 'Local-first systems',
            completedUnits: 0,
            totalUnits: 12,
          },
        ],
      },
      version: 1,
    });

    useReadingStore.setState({ items: [] });
    vi.mocked(localStorage.getItem).mockImplementation((key) =>
      key === READING_KEY ? serialized : null
    );
    await useReadingStore.persist.rehydrate();
    expect(useReadingStore.getState().items[0]?.title).toBe('Local-first systems');
  });

  it('writes service state as versioned JSON and restores it', async () => {
    useServiceStore.getState().addEntry({
      date: '2026-08-28',
      hours: 1.5,
      type: 'field',
      notes: 'Afternoon',
    });

    const serialized = lastPersistedValue(SERVICE_KEY);
    const persisted = JSON.parse(serialized);
    expect(persisted).toMatchObject({
      state: {
        entries: [{ date: '2026-08-28', hours: 1.5, type: 'field' }],
        weeklyGoal: 4,
        monthlyGoal: 16,
      },
      version: 1,
    });

    useServiceStore.setState({ entries: [] });
    vi.mocked(localStorage.getItem).mockImplementation((key) =>
      key === SERVICE_KEY ? serialized : null
    );
    await useServiceStore.persist.rehydrate();
    expect(useServiceStore.getState().entries).toHaveLength(1);
    expect(useServiceStore.getState().entries[0]?.hours).toBe(1.5);
  });

  it('migrates valid v0 data and quarantines malformed records', async () => {
    const validReading = {
      id: 1,
      title: 'Preserved',
      type: 'book',
      totalUnits: 10,
      completedUnits: 2,
      startedDate: '2026-08-01',
      notes: '',
    };
    vi.mocked(localStorage.getItem).mockImplementation((key) => {
      if (key !== READING_KEY) return null;
      return JSON.stringify({
        state: { items: [validReading, { title: 'missing fields' }] },
        version: 0,
      });
    });

    await useReadingStore.persist.rehydrate();
    expect(useReadingStore.getState().items).toEqual([validReading]);
    expect(useReadingStore.getState().quarantinedItems).toEqual([{ title: 'missing fields' }]);
  });

  it('validates current-version service state during every hydration', async () => {
    const validEntry = {
      id: 1,
      date: '2026-08-28',
      hours: 2,
      type: 'field',
      notes: '',
    };
    vi.mocked(localStorage.getItem).mockImplementation((key) => {
      if (key !== SERVICE_KEY) return null;
      return JSON.stringify({
        state: { entries: [validEntry, { id: 'bad' }], weeklyGoal: -1, monthlyGoal: 20 },
        version: 1,
      });
    });

    await useServiceStore.persist.rehydrate();
    expect(useServiceStore.getState().entries).toEqual([validEntry]);
    expect(useServiceStore.getState().quarantinedEntries).toEqual([{ id: 'bad' }]);
    expect(useServiceStore.getState().weeklyGoal).toBe(4);
    expect(useServiceStore.getState().monthlyGoal).toBe(20);
  });

  it.each([
    {
      name: 'progress',
      key: 'ls-progress-storage',
      mutate: () => useProgressStore.getState().markDailyTextRead('2026-09-01'),
      expected: {
        dailyTexts: {
          '2026-09-01': expect.objectContaining({ read: true, progress: 100 }),
        },
      },
    },
    {
      name: 'settings',
      key: 'ls-progress-settings',
      mutate: () => useSettingsStore.getState().setTheme('dark'),
      expected: { theme: 'dark' },
    },
    {
      name: 'gamification',
      key: 'ls-gamification-storage',
      mutate: () => useGamificationStore.getState().addPoints(7),
      expected: { points: expect.any(Number) },
    },
    {
      name: 'goals',
      key: 'ls-goals-storage',
      mutate: () => useGoalsStore.getState().addGoal({ title: 'Recover this goal' }),
      expected: {
        goals: expect.arrayContaining([expect.objectContaining({ title: 'Recover this goal' })]),
      },
    },
    {
      name: 'memories',
      key: 'ls-memories-storage',
      mutate: () => useMemoriesStore.getState().saveReflection('2026-09-01', 'Recover this note'),
      expected: {
        reflections: {
          '2026-09-01': expect.objectContaining({ content: 'Recover this note' }),
        },
      },
    },
    {
      name: 'reading',
      key: READING_KEY,
      mutate: () =>
        useReadingStore.getState().addItem({
          title: 'Recover this reading item',
          type: 'book',
          totalUnits: 20,
        }),
      expected: { items: [expect.objectContaining({ title: 'Recover this reading item' })] },
    },
    {
      name: 'service',
      key: SERVICE_KEY,
      mutate: () =>
        useServiceStore.getState().addEntry({
          date: '2026-09-01',
          hours: 1,
          type: 'field',
        }),
      expected: { entries: [expect.objectContaining({ date: '2026-09-01', hours: 1 })] },
    },
  ])('retains and exactly retries a failed $name write', ({ key, mutate, expected }) => {
    const workingSetItem = vi.mocked(localStorage.setItem).getMockImplementation();
    const before = localStorage.getItem(key);
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new DOMException('Origin quota exhausted', 'QuotaExceededError');
    });

    mutate();

    const recovery = getStorageRecovery(key);
    expect(recovery).toMatchObject({ storeName: key, key, operation: 'write' });
    const serialized = recovery?.value || '';
    expect(JSON.parse(serialized).state).toMatchObject(expected);
    expect(localStorage.getItem(key)).toBe(before);

    vi.mocked(localStorage.setItem).mockImplementation(workingSetItem!);
    expect(retryStorageWrite(key)).toBe(true);
    expect(localStorage.getItem(key)).toBe(serialized);
    expect(getStorageRecovery(key)).toBeNull();
  });
});
