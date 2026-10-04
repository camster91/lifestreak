import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createSafeStorage } from '../utils/storageErrorHandler.js';

interface Reflection {
  content: string;
  updatedAt: string;
  createdAt: string;
}

interface StudySession {
  id: string;
  date: string;
  topic: string;
  minutes: number;
  notes: string;
}

interface MemoriesState {
  reflections: Record<string, Reflection>;
  studySessions: StudySession[];
}

interface MemoriesActions {
  saveReflection: (date: string, content: string) => void;
  getReflection: (date: string) => string;
  getAllReflections: () => ({ date: string } & Reflection)[];
  getReflectionsByMonth: (year: number, month: number) => ({ date: string } & Reflection)[];
  deleteReflection: (date: string) => void;
  getReflectionCount: () => number;
  searchReflections: (query: string) => ({ date: string } & Reflection)[];
  addStudySession: (session: Omit<StudySession, 'id'>) => StudySession;
  getStudySessions: () => StudySession[];
  deleteStudySession: (id: string) => void;
}

const useMemoriesStore = create<MemoriesState & MemoriesActions>()(
  persist(
    (set, get) => ({
      reflections: {},
      studySessions: [],

      saveReflection: (date, content) =>
        set((state) => ({
          reflections: {
            ...state.reflections,
            [date]: {
              content,
              updatedAt: new Date().toISOString(),
              createdAt: state.reflections[date]?.createdAt || new Date().toISOString(),
            },
          },
        })),

      getReflection: (date) => {
        const state = get();
        return state.reflections[date]?.content || '';
      },

      getAllReflections: () => {
        const state = get();
        return Object.entries(state.reflections)
          .map(([date, data]) => ({
            date,
            ...data,
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      getReflectionsByMonth: (year, month) => {
        const state = get();
        const prefix = `${year}-${String(month).padStart(2, '0')}`;
        return Object.entries(state.reflections)
          .filter(([date]) => date.startsWith(prefix))
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      deleteReflection: (date) =>
        set((state) => {
          const { [date]: _removed, ...rest } = state.reflections;
          return { reflections: rest };
        }),

      getReflectionCount: () => {
        const state = get();
        return Object.keys(state.reflections).length;
      },

      searchReflections: (query) => {
        const state = get();
        const lowerQuery = query.toLowerCase();
        return Object.entries(state.reflections)
          .filter(([, data]) => data.content.toLowerCase().includes(lowerQuery))
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      addStudySession: (session) => {
        const entry: StudySession = {
          id:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `study-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          date: session.date,
          topic: session.topic,
          minutes: session.minutes,
          notes: session.notes,
        };
        set((state) => ({ studySessions: [entry, ...state.studySessions] }));
        return entry;
      },

      getStudySessions: () => get().studySessions,

      deleteStudySession: (id) =>
        set((state) => ({
          studySessions: state.studySessions.filter((session) => session.id !== id),
        })),
    }),
    {
      name: 'ls-memories-storage',
      version: 1,
      storage: createJSONStorage(() => createSafeStorage('ls-memories-storage')),
      partialize: (state) => ({
        reflections: state.reflections,
        studySessions: state.studySessions,
      }),
      merge: (persisted, current) => {
        const data = (persisted || {}) as Partial<MemoriesState>;
        const reflections =
          data.reflections ||
          (data as { memories?: MemoriesState['reflections'] }).memories ||
          {};
        return {
          ...current,
          ...data,
          reflections,
          studySessions: Array.isArray(data.studySessions) ? data.studySessions : [],
        };
      },
    }
  )
);

export default useMemoriesStore;
