import { beforeEach, describe, expect, it, vi } from 'vitest';
import useReadingStore from './readingStore';
import useServiceStore from './serviceStore';

const READING_KEY = 'ls-reading-storage';
const SERVICE_KEY = 'ls-service-storage';

beforeEach(() => {
  useReadingStore.setState({ items: [] });
  useServiceStore.setState({ entries: [], weeklyGoal: 4, monthlyGoal: 16 });
});

function lastPersistedValue(key: string) {
  const call = vi
    .mocked(localStorage.setItem)
    .mock.calls.findLast(([storedKey]) => storedKey === key);
  expect(call).toBeDefined();
  return call?.[1] || '';
}

describe('specialist store persistence', () => {
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
      version: 0,
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
      version: 0,
    });

    useServiceStore.setState({ entries: [] });
    vi.mocked(localStorage.getItem).mockImplementation((key) =>
      key === SERVICE_KEY ? serialized : null
    );
    await useServiceStore.persist.rehydrate();
    expect(useServiceStore.getState().entries).toHaveLength(1);
    expect(useServiceStore.getState().entries[0]?.hours).toBe(1.5);
  });
});
