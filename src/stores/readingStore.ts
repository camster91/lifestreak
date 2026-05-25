import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const createSafeStorage = (key) => ({
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Ignore quota errors
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // Ignore
    }
  },
});

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
  addItem: (item: Omit<ReadingItem, 'id' | 'completedUnits' | 'startedDate'>) => void;
  updateProgress: (id: number, completedUnits: number) => void;
  finishItem: (id: number) => void;
  deleteItem: (id: number) => void;
  getInProgress: () => ReadingItem[];
  getCompleted: () => ReadingItem[];
}

const useReadingStore = create<ReadingState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({
          items: [
            {
              id: Date.now(),
              ...item,
              completedUnits: 0,
              startedDate: new Date().toISOString().split('T')[0],
            },
            ...state.items,
          ],
        })),
      updateProgress: (id, completedUnits) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, completedUnits } : item
          ),
        })),
      finishItem: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  completedUnits: item.totalUnits,
                  finishedDate: new Date().toISOString().split('T')[0],
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
      storage: createSafeStorage('ls-reading-storage') as any,
      partialize: (state) => ({
        items: state.items,
      }),
    }
  )
);

export default useReadingStore;
export type { ReadingItem };
