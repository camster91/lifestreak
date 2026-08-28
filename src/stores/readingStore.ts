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
    typeof item.startedDate === 'string' &&
    (item.finishedDate === undefined || typeof item.finishedDate === 'string') &&
    typeof item.notes === 'string'
  );
}

export function normalizeReadingPersistence(value: unknown): PersistedReadingState {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const candidates = Array.isArray(source.items) ? source.items : [];
  return {
    items: candidates.filter(isReadingItem),
    quarantinedItems: [
      ...(Array.isArray(source.quarantinedItems) ? source.quarantinedItems : []),
      ...candidates.filter((item) => !isReadingItem(item)),
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
          items: state.items.map((item) => (item.id === id ? { ...item, completedUnits } : item)),
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
