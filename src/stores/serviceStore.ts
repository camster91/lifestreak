import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, startOfWeek, startOfMonth, isSameWeek, isSameMonth } from 'date-fns';

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

interface ServiceEntry {
  id: number;
  date: string;
  hours: number;
  type: 'field' | 'rv' | 'study' | 'talk' | 'other';
  notes: string;
}

interface ServiceState {
  entries: ServiceEntry[];
  weeklyGoal: number;
  monthlyGoal: number;
  addEntry: (entry: Omit<ServiceEntry, 'id'>) => void;
  deleteEntry: (id: number) => void;
  getWeeklyTotal: () => number;
  getMonthlyTotal: () => number;
  getTotalHours: () => number;
  setWeeklyGoal: (hours: number) => void;
  setMonthlyGoal: (hours: number) => void;
}

const useServiceStore = create<ServiceState>()(
  persist(
    (set, get) => ({
      entries: [],
      weeklyGoal: 4,
      monthlyGoal: 16,
      addEntry: (entry) =>
        set((state) => ({
          entries: [{ id: Date.now(), ...entry }, ...state.entries],
        })),
      deleteEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),
      getWeeklyTotal: () => {
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        return get()
          .entries.filter((e) => new Date(e.date) >= weekStart)
          .reduce((sum, e) => sum + e.hours, 0);
      },
      getMonthlyTotal: () => {
        const now = new Date();
        const monthStart = startOfMonth(now);
        return get()
          .entries.filter((e) => new Date(e.date) >= monthStart)
          .reduce((sum, e) => sum + e.hours, 0);
      },
      getTotalHours: () => {
        return get().entries.reduce((sum, e) => sum + e.hours, 0);
      },
      setWeeklyGoal: (hours) => set({ weeklyGoal: hours }),
      setMonthlyGoal: (hours) => set({ monthlyGoal: hours }),
    }),
    {
      name: 'ls-service-storage',
      storage: createSafeStorage('ls-service-storage') as any,
      partialize: (state) => ({
        entries: state.entries,
        weeklyGoal: state.weeklyGoal,
        monthlyGoal: state.monthlyGoal,
      }),
    }
  )
);

export default useServiceStore;
export type { ServiceEntry };
