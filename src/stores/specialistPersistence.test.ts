import { beforeEach, describe, expect, it, vi } from 'vitest';
import useGamificationStore from './gamificationStore';
import useGoalsStore from './goalsStore';
import useMemoriesStore from './memoriesStore';
import useProgressStore from './progressStore';
import useReadingStore from './readingStore';
import useServiceStore from './serviceStore';
import useSettingsStore from './settingsStore';

const READING_KEY = 'ls-reading-storage';
const SERVICE_KEY = 'ls-service-storage';

function expectJsonWrite(key: string) {
  const serialized = lastPersistedValue(key);
  expect(serialized).not.toBe('[object Object]');
  expect(() => JSON.parse(serialized)).not.toThrow();
  expect(JSON.parse(serialized)).toHaveProperty('state');
}

beforeEach(() => {
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
});
