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
      storage: createJSONStorage(() => createSafeStorage('ls-reading-storage')),
      partialize: (state) => ({
        items: state.items,
      }),
    }
  )
);

export default useReadingStore;
export type { ReadingItem };
