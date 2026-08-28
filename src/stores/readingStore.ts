import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createSafeStorage } from '../utils/storageErrorHandler.js';

interface ReadingItem {
  id: number;
  title: string;
  type: 'book' | 'audio' | 'video' | 'article';
  totalUnits: number;
  completedUnits: number;
  startedDate: string;
  finishedDate?: string;
  notes: string;
  unitLabel?: 'chapters' | 'pages' | 'minutes' | 'parts';
}

interface ReadingState {
  items: ReadingItem[];
  quarantinedItems: unknown[];
  addItem: (item: Omit<ReadingItem, 'id' | 'completedUnits' | 'startedDate'>) => void;
  updateProgress: (id: number, completedUnits: number) => void;
  finishItem: (id: number) => void;
  deleteItem: (id: number) => void;
  getInProgress: () => ReadingItem[];
  getCompleted: () => ReadingItem[];
}

interface PersistedReadingState {
  items: ReadingItem[];
  quarantinedItems: unknown[];
}

const READING_TYPES = new Set(['book', 'audio', 'video', 'article']);
const READING_UNITS = new Set(['chapters', 'pages', 'minutes', 'parts']);

export function isValidReadingDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const candidate = new Date(year, month - 1, day);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

function isReadingItem(value: unknown): value is ReadingItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ReadingItem>;
  return (
    typeof item.id === 'number' &&
    Number.isFinite(item.id) &&
    typeof item.title === 'string' &&
    typeof item.type === 'string' &&
    READING_TYPES.has(item.type) &&
    typeof item.totalUnits === 'number' &&
    Number.isFinite(item.totalUnits) &&
    item.totalUnits > 0 &&
    typeof item.completedUnits === 'number' &&
    Number.isFinite(item.completedUnits) &&
    item.completedUnits >= 0 &&
    item.completedUnits <= item.totalUnits &&
    isValidReadingDateKey(item.startedDate) &&
    (item.finishedDate === undefined ||
      (isValidReadingDateKey(item.finishedDate) && item.finishedDate >= item.startedDate)) &&
    typeof item.notes === 'string' &&
    (item.unitLabel === undefined ||
      (typeof item.unitLabel === 'string' && READING_UNITS.has(item.unitLabel)))
  );
}

export function readingItemPercent(item: Pick<ReadingItem, 'completedUnits' | 'totalUnits'>) {
  if (
    !Number.isFinite(item.completedUnits) ||
    !Number.isFinite(item.totalUnits) ||
    item.totalUnits <= 0
  ) {
    return null;
  }
  return Math.round(
    (Math.min(Math.max(item.completedUnits, 0), item.totalUnits) / item.totalUnits) * 100
  );
}

export function summarizeReadingProgress(items: ReadingItem[], quarantinedItems: unknown[] = []) {
  const active = items.filter((item) => !item.finishedDate);
  const percentages = active
    .map(readingItemPercent)
    .filter((value): value is number => value !== null);
  return {
    activeCount: active.length,
    percent: percentages.length
      ? Math.round(percentages.reduce((total, value) => total + value, 0) / percentages.length)
      : null,
    hasUnknownRecords: quarantinedItems.length > 0 || percentages.length !== active.length,
  };
}

export function normalizeReadingPersistence(value: unknown): PersistedReadingState {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const candidates = Array.isArray(source.items) ? source.items : [];
  const seenIds = new Set<number>();
  const items: ReadingItem[] = [];
  const rejectedItems: unknown[] = [];
  for (const candidate of candidates) {
    if (!isReadingItem(candidate) || seenIds.has(candidate.id)) {
      rejectedItems.push(candidate);
      continue;
    }
    seenIds.add(candidate.id);
    items.push(candidate);
  }
  return {
    items,
    quarantinedItems: [
      ...(Array.isArray(source.quarantinedItems) ? source.quarantinedItems : []),
      ...rejectedItems,
    ],
  };
}

const useReadingStore = create<ReadingState>()(
  persist(
    (set, get) => ({
      items: [],
      quarantinedItems: [],
      addItem: (item) =>
        set((state) => ({
          items: [
            {
              id: Date.now(),
              ...item,
              completedUnits: 0,
              startedDate: new Date().toISOString().slice(0, 10),
            },
            ...state.items,
          ],
        })),
      updateProgress: (id, completedUnits) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  completedUnits: Math.min(Math.max(completedUnits, 0), item.totalUnits),
                }
              : item
          ),
        })),
      finishItem: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  completedUnits: item.totalUnits,
                  finishedDate: new Date().toISOString().slice(0, 10),
                }
              : item
          ),
        })),
      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      getInProgress: () => {
        return get().items.filter((item) => !item.finishedDate);
      },
      getCompleted: () => {
        return get().items.filter((item) => item.finishedDate);
      },
    }),
    {
      name: 'ls-reading-storage',
      version: 1,
      migrate: (persisted) => normalizeReadingPersistence(persisted),
      storage: createJSONStorage(() => createSafeStorage('ls-reading-storage')),
      merge: (persisted, current) => ({
        ...current,
        ...normalizeReadingPersistence(persisted),
      }),
      partialize: (state) => ({
        items: state.items,
        quarantinedItems: state.quarantinedItems,
      }),
    }
  )
);

export default useReadingStore;
export type { ReadingItem };
