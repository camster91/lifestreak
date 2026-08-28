import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { createSafeStorage } from '../utils/storageErrorHandler.js';

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

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidLocalDateKey(value: string): boolean {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const candidate = new Date(Number(year), Number(month) - 1, Number(day));
  return (
    candidate.getFullYear() === Number(year) &&
    candidate.getMonth() === Number(month) - 1 &&
    candidate.getDate() === Number(day)
  );
}

export function totalEntriesInLocalPeriod(
  entries: ServiceEntry[],
  periodStart: string,
  periodEnd: string
): number {
  return entries
    .filter(
      (entry) =>
        isValidLocalDateKey(entry.date) &&
        entry.date >= periodStart &&
        entry.date <= periodEnd &&
        Number.isFinite(entry.hours)
    )
    .reduce((sum, entry) => sum + entry.hours, 0);
}

export function getServicePeriodTotals(entries: ServiceEntry[], now = new Date()) {
  const today = format(now, 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  return {
    weekly: totalEntriesInLocalPeriod(entries, weekStart, today),
    monthly: totalEntriesInLocalPeriod(entries, monthStart, today),
  };
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
        return getServicePeriodTotals(get().entries).weekly;
      },
      getMonthlyTotal: () => {
        return getServicePeriodTotals(get().entries).monthly;
      },
      getTotalHours: () => {
        return get().entries.reduce((sum, e) => sum + e.hours, 0);
      },
      setWeeklyGoal: (hours) => set({ weeklyGoal: hours }),
      setMonthlyGoal: (hours) => set({ monthlyGoal: hours }),
    }),
    {
      name: 'ls-service-storage',
      storage: createJSONStorage(() => createSafeStorage('ls-service-storage')),
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
