import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { format, startOfWeek } from 'date-fns';
import { createSafeStorage } from '../utils/storageErrorHandler.js';

interface DailyTextData {
  readScripture: boolean;
  progress: number;
  read?: boolean;
  timestamp: string | null;
}

interface PrayerData {
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  timestamp: string | null;
}

interface StudyLink {
  id: string;
  url: string;
  title: string;
}

interface FamilyWorshipData {
  completed: boolean;
  date: string | null;
  topic: string;
  notes: string;
  studyLinks: StudyLink[];
  timestamp: string | null;
}

interface MeetingPartData {
  parts: Record<string, boolean>;
  progress: number;
  prepared: boolean;
  timestamp: string | null;
}

interface BibleReadingData {
  progress: number;
  chaptersRead?: number[];
  read: boolean;
  status: 'not_started' | 'in_progress' | 'completed';
  timestamp: string | null;
}

interface WeeklyReadingData {
  chapters: Record<number, boolean>;
  completed: boolean;
  totalChapters: number;
  timestamp: string | null;
}

interface ProgressState {
  dailyTexts: Record<string, DailyTextData>;
  prayers: Record<string, PrayerData>;
  familyWorship: Record<string, FamilyWorshipData>;
  bibleReadings: Record<string, BibleReadingData>;
  bibleChapters: Record<string, Record<number, boolean>>;
  meetings: Record<string, MeetingPartData>;
  weeklyReadings: Record<string, WeeklyReadingData>;
}

interface ProgressActions {
  updateDailyTextProgress: (
    date: string,
    field: keyof DailyTextData,
    value: boolean | number | string | null
  ) => void;
  markDailyTextRead: (date: string) => void;
  isDailyTextRead: (date: string) => boolean;
  getDailyTextProgress: (
    date: string
  ) => DailyTextData | { readScripture: boolean; progress: number };
  updatePrayerProgress: (date: string, prayerType: keyof PrayerData, value: boolean) => void;
  getPrayerProgress: (
    date: string
  ) => PrayerData | { morning: boolean; afternoon: boolean; evening: boolean };
  getAllPrayersComplete: (date: string) => boolean | undefined;
  getPrayerStreak: () => number;
  updateFamilyWorship: (weekKey: string, data: Partial<FamilyWorshipData>) => void;
  toggleFamilyWorshipComplete: (weekKey: string) => void;
  addStudyLink: (weekKey: string, link: Omit<StudyLink, 'id'>) => void;
  removeStudyLink: (weekKey: string, linkId: string) => void;
  getFamilyWorship: (weekKey: string) => FamilyWorshipData;
  getWeekKey: (date?: Date) => string;
  getFamilyWorshipStreak: () => number;
  getDailyTextStreak: () => number;
  getBibleReadingStreak: () => number;
  getCompletionRate: (category: string, days: number) => number;
  toggleBibleChapter: (dateKey: string, chapterIndex: number) => void;
  getBibleChapterProgress: (dateKey: string) => Record<number, boolean>;
  updateBibleReadingProgress: (dateKey: string, progress: number, chaptersRead?: number[]) => void;
  markBibleReadingComplete: (dateKey: string) => void;
  isBibleReadingComplete: (dateKey: string) => boolean;
  getBibleReadingProgress: (dateKey: string) => number;
  getWeeklyReadingProgress: (weekKey: string) => WeeklyReadingData;
  toggleWeeklyChapter: (weekKey: string, chapterIndex: number) => void;
  isWeeklyReadingComplete: (weekKey: string, totalChapters: number) => boolean;
  markWeeklyReadingComplete: (weekKey: string, totalChapters: number) => void;
  getWeeklyReadingStreak: () => number;
  getMeetingProgress: (weekOf: string, meetingType: string) => MeetingPartData;
  isMeetingPrepared: (weekOf: string, meetingType: string) => boolean;
  markMeetingPrepared: (weekOf: string, meetingType: string, duration?: number) => void;
  updateMeetingPartProgress: (
    weekOf: string,
    meetingType: string,
    partKey: string,
    completed: boolean
  ) => void;
  initMeetingParts: (weekOf: string, meetingType: string, partKeys: string[]) => void;
  clearAll: () => void;
  pruneOldEntries: () => void;
}

/** Keep ~13 months of daily keys and ~2 years of weekly keys to bound localStorage growth. */
export const MAX_DAILY_PROGRESS_ENTRIES = 400;
export const MAX_WEEKLY_PROGRESS_ENTRIES = 110;
export const MAX_BIBLE_DAY_ENTRIES = 400;
export const MAX_MEETING_ENTRIES = 220;
export const LEGACY_BIBLE_DAY_PREFIX = 'legacy-day-of-year:';

export const getLocalDateKey = (date = new Date()): string => format(date, 'yyyy-MM-dd');

export function isValidProgressDateKey(value: unknown): value is string {
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

function quarantineYearlessBibleKeys<T>(record: Record<string, T> = {}): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      /^\d{1,3}$/.test(key) ? `${LEGACY_BIBLE_DAY_PREFIX}${key}` : key,
      value,
    ])
  );
}

export function migrateProgressPersistence(persisted: unknown, version: number): unknown {
  if (!persisted || typeof persisted !== 'object' || version >= 2) return persisted;
  const state = persisted as Partial<ProgressState>;
  return {
    ...state,
    bibleReadings: quarantineYearlessBibleKeys(state.bibleReadings),
    bibleChapters: quarantineYearlessBibleKeys(state.bibleChapters),
  };
}

export function pruneRecordBySortedKeys<T>(
  record: Record<string, T>,
  maxEntries: number
): Record<string, T> {
  const keys = Object.keys(record);
  if (keys.length <= maxEntries) return record;
  const sorted = keys.slice().sort();
  const dropCount = sorted.length - maxEntries;
  const next = { ...record };
  for (let i = 0; i < dropCount; i++) {
    const key = sorted[i];
    if (key !== undefined) delete next[key];
  }
  return next;
}

export function pruneProgressMaps<T extends ProgressState>(state: T): T {
  return {
    ...state,
    dailyTexts: pruneRecordBySortedKeys(state.dailyTexts, MAX_DAILY_PROGRESS_ENTRIES),
    prayers: pruneRecordBySortedKeys(state.prayers, MAX_DAILY_PROGRESS_ENTRIES),
    familyWorship: pruneRecordBySortedKeys(state.familyWorship, MAX_WEEKLY_PROGRESS_ENTRIES),
    weeklyReadings: pruneRecordBySortedKeys(state.weeklyReadings, MAX_WEEKLY_PROGRESS_ENTRIES),
    bibleReadings: pruneRecordBySortedKeys(state.bibleReadings, MAX_BIBLE_DAY_ENTRIES),
    bibleChapters: pruneRecordBySortedKeys(state.bibleChapters, MAX_BIBLE_DAY_ENTRIES),
    meetings: pruneRecordBySortedKeys(state.meetings, MAX_MEETING_ENTRIES),
  };
}

const useProgressStore = create<ProgressState & ProgressActions>()(
  persist(
    (set, get) => ({
      dailyTexts: {},
      prayers: {},
      familyWorship: {},
      bibleReadings: {},
      bibleChapters: {},
      weeklyReadings: {},
      meetings: {},

      updateDailyTextProgress: (date, field, value) =>
        set((state) => {
          const existing = state.dailyTexts[date] || {
            readScripture: false,
            progress: 0,
            timestamp: null,
          };
          const updated = { ...existing, [field]: value, timestamp: new Date().toISOString() };
          updated.progress = updated.readScripture ? 100 : 0;
          updated.read = updated.readScripture;
          return {
            dailyTexts: { ...state.dailyTexts, [date]: updated },
          };
        }),

      markDailyTextRead: (date) =>
        set((state) => ({
          dailyTexts: {
            ...state.dailyTexts,
            [date]: {
              readScripture: true,
              progress: 100,
              read: true,
              timestamp: new Date().toISOString(),
            },
          },
        })),

      isDailyTextRead: (date) => {
        const state = get();
        const data = state.dailyTexts[date];
        return data?.read || data?.readScripture || false;
      },

      getDailyTextProgress: (date) => {
        const state = get();
        return state.dailyTexts[date] || { readScripture: false, progress: 0 };
      },

      updatePrayerProgress: (date, prayerType, value) =>
        set((state) => {
          const existing = state.prayers[date] || {
            morning: false,
            afternoon: false,
            evening: false,
            timestamp: null,
          };
          const updated = { ...existing, [prayerType]: value, timestamp: new Date().toISOString() };
          return {
            prayers: { ...state.prayers, [date]: updated },
          };
        }),

      getPrayerProgress: (date) => {
        const state = get();
        return state.prayers[date] || { morning: false, afternoon: false, evening: false };
      },

      getAllPrayersComplete: (date) => {
        const state = get();
        const prayers = state.prayers[date];
        return prayers?.morning && prayers?.afternoon && prayers?.evening;
      },

      getPrayerStreak: () => {
        const state = get();
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = format(date, 'yyyy-MM-dd');
          const prayers = state.prayers[dateStr];
          if (prayers?.morning && prayers?.afternoon && prayers?.evening) {
            streak++;
          } else {
            break;
          }
        }
        return streak;
      },

      updateFamilyWorship: (weekKey, data) =>
        set((state) => ({
          familyWorship: {
            ...state.familyWorship,
            [weekKey]: {
              ...(state.familyWorship[weekKey] || {
                completed: false,
                date: null,
                topic: '',
                notes: '',
                studyLinks: [],
                timestamp: null,
              }),
              ...data,
              timestamp: new Date().toISOString(),
            },
          },
        })),

      toggleFamilyWorshipComplete: (weekKey) =>
        set((state) => {
          const existing = state.familyWorship[weekKey] || {
            completed: false,
            date: null,
            topic: '',
            notes: '',
            studyLinks: [],
            timestamp: null,
          };
          return {
            familyWorship: {
              ...state.familyWorship,
              [weekKey]: {
                ...existing,
                completed: !existing.completed,
                timestamp: new Date().toISOString(),
              },
            },
          };
        }),

      addStudyLink: (weekKey, link) =>
        set((state) => {
          const existing = state.familyWorship[weekKey] || {
            completed: false,
            date: null,
            topic: '',
            notes: '',
            studyLinks: [],
            timestamp: null,
          };
          return {
            familyWorship: {
              ...state.familyWorship,
              [weekKey]: {
                ...existing,
                studyLinks: [...existing.studyLinks, { id: crypto.randomUUID(), ...link }],
                timestamp: new Date().toISOString(),
              },
            },
          };
        }),

      removeStudyLink: (weekKey, linkId) =>
        set((state) => {
          const existing = state.familyWorship[weekKey];
          if (!existing) return state;
          return {
            familyWorship: {
              ...state.familyWorship,
              [weekKey]: {
                ...existing,
                studyLinks: existing.studyLinks.filter((l) => l.id !== linkId),
                timestamp: new Date().toISOString(),
              },
            },
          };
        }),

      getFamilyWorship: (weekKey) => {
        const state = get();
        return (
          state.familyWorship[weekKey] || {
            completed: false,
            date: null,
            topic: '',
            notes: '',
            studyLinks: [],
            timestamp: null,
          }
        );
      },

      getWeekKey: (date = new Date()) => {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        return format(weekStart, 'yyyy-MM-dd');
      },

      getFamilyWorshipStreak: () => {
        const state = get();
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 52; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i * 7);
          const weekKey = get().getWeekKey(date);
          if (state.familyWorship[weekKey]?.completed) {
            streak++;
          } else {
            break;
          }
        }
        return streak;
      },

      getDailyTextStreak: () => {
        const state = get();
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = format(date, 'yyyy-MM-dd');
          const data = state.dailyTexts[dateStr];
          if (data?.readScripture || data?.read) {
            streak++;
          } else {
            break;
          }
        }
        return streak;
      },

      getBibleReadingStreak: () => {
        const state = get();
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateKey = getLocalDateKey(date);
          const data = state.bibleReadings[dateKey];
          if (data?.read || data?.progress === 100) {
            streak++;
          } else {
            break;
          }
        }
        return streak;
      },

      getCompletionRate: (category, days) => {
        const state = get();
        let completed = 0;
        const today = new Date();
        for (let i = 0; i < days; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          if (category === 'dailyText') {
            const dateStr = format(date, 'yyyy-MM-dd');
            const data = state.dailyTexts[dateStr];
            if (data?.readScripture || data?.read) completed++;
          } else if (category === 'bibleReading') {
            const dateKey = getLocalDateKey(date);
            const data = state.bibleReadings[dateKey];
            if (data?.read || data?.progress === 100) completed++;
          }
        }
        return Math.round((completed / days) * 100);
      },

      toggleBibleChapter: (dateKey, chapterIndex) => {
        if (!isValidProgressDateKey(dateKey)) return;
        set((state) => ({
          bibleChapters: {
            ...state.bibleChapters,
            [dateKey]: {
              ...(state.bibleChapters[dateKey] || {}),
              [chapterIndex]: !(state.bibleChapters[dateKey] || {})[chapterIndex],
            },
          },
        }));
      },

      getBibleChapterProgress: (dateKey) => {
        if (!isValidProgressDateKey(dateKey)) return {};
        const state = get();
        return state.bibleChapters[dateKey] || {};
      },

      updateBibleReadingProgress: (dateKey, progress, chaptersRead = []) => {
        if (!isValidProgressDateKey(dateKey)) return;
        set((state) => ({
          bibleReadings: {
            ...state.bibleReadings,
            [dateKey]: {
              progress,
              chaptersRead,
              read: progress === 100,
              status:
                progress === 0 ? 'not_started' : progress === 100 ? 'completed' : 'in_progress',
              timestamp: new Date().toISOString(),
            },
          },
        }));
      },

      markBibleReadingComplete: (dateKey) => {
        if (!isValidProgressDateKey(dateKey)) return;
        set((state) => ({
          bibleReadings: {
            ...state.bibleReadings,
            [dateKey]: {
              progress: 100,
              read: true,
              status: 'completed',
              timestamp: new Date().toISOString(),
            },
          },
        }));
      },

      isBibleReadingComplete: (dateKey) => {
        if (!isValidProgressDateKey(dateKey)) return false;
        const state = get();
        const chapters = state.bibleChapters[dateKey] || {};
        const completedCount = Object.values(chapters).filter(Boolean).length;
        if (completedCount > 0) {
          const hasIncomplete = Object.values(chapters).some((v) => v === false);
          if (!hasIncomplete && completedCount > 0) return true;
        }
        return (
          state.bibleReadings[dateKey]?.read ||
          state.bibleReadings[dateKey]?.progress === 100 ||
          false
        );
      },

      getBibleReadingProgress: (dateKey) => {
        if (!isValidProgressDateKey(dateKey)) return 0;
        const state = get();
        return state.bibleReadings[dateKey]?.progress || 0;
      },

      getWeeklyReadingProgress: (weekKey) => {
        const state = get();
        return (
          state.weeklyReadings[weekKey] || {
            chapters: {},
            completed: false,
            totalChapters: 0,
            timestamp: null,
          }
        );
      },

      toggleWeeklyChapter: (weekKey, chapterIndex) =>
        set((state) => {
          const existing = state.weeklyReadings[weekKey] || {
            chapters: {},
            completed: false,
            totalChapters: 0,
            timestamp: null,
          };
          const chapters = {
            ...existing.chapters,
            [chapterIndex]: !existing.chapters[chapterIndex],
          };
          return {
            weeklyReadings: {
              ...state.weeklyReadings,
              [weekKey]: { ...existing, chapters, timestamp: new Date().toISOString() },
            },
          };
        }),

      isWeeklyReadingComplete: (weekKey, totalChapters) => {
        const state = get();
        const data = state.weeklyReadings[weekKey];
        if (!data) return false;
        if (data.completed) return true;
        const completedCount = Object.values(data.chapters).filter(Boolean).length;
        return completedCount >= totalChapters && totalChapters > 0;
      },

      markWeeklyReadingComplete: (weekKey, totalChapters) =>
        set((state) => {
          const existing = state.weeklyReadings[weekKey] || {
            chapters: {},
            completed: false,
            totalChapters: 0,
            timestamp: null,
          };
          const chapters = { ...existing.chapters };
          for (let i = 0; i < totalChapters; i++) {
            chapters[i] = true;
          }
          return {
            weeklyReadings: {
              ...state.weeklyReadings,
              [weekKey]: {
                chapters,
                completed: true,
                totalChapters,
                timestamp: new Date().toISOString(),
              },
            },
          };
        }),

      getWeeklyReadingStreak: () => {
        const state = get();
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 52; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i * 7);
          const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
          const dayNum = d.getUTCDay() || 7;
          d.setUTCDate(d.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
          const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
          const weekKey = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
          if (state.weeklyReadings[weekKey]?.completed) {
            streak++;
          } else {
            break;
          }
        }
        return streak;
      },

      getMeetingProgress: (weekOf, meetingType) => {
        const state = get();
        const key = `${weekOf}-${meetingType}`;
        return state.meetings[key] || { parts: {}, progress: 0, prepared: false, timestamp: null };
      },

      isMeetingPrepared: (weekOf, meetingType) => {
        const state = get();
        const key = `${weekOf}-${meetingType}`;
        return state.meetings[key]?.prepared || false;
      },

      markMeetingPrepared: (weekOf, meetingType) =>
        set((state) => {
          const key = `${weekOf}-${meetingType}`;
          const existing = state.meetings[key] || {
            parts: {},
            progress: 0,
            prepared: false,
            timestamp: null,
          };
          const parts = { ...existing.parts };
          Object.keys(parts).forEach((k) => {
            parts[k] = true;
          });
          return {
            meetings: {
              ...state.meetings,
              [key]: {
                ...existing,
                parts,
                progress: 100,
                prepared: true,
                timestamp: new Date().toISOString(),
              },
            },
          };
        }),

      updateMeetingPartProgress: (weekOf, meetingType, partKey, completed) =>
        set((state) => {
          const key = `${weekOf}-${meetingType}`;
          const existing = state.meetings[key] || {
            parts: {},
            progress: 0,
            prepared: false,
            timestamp: null,
          };
          const parts = { ...existing.parts, [partKey]: completed };
          const totalParts = Object.keys(parts).length;
          const completedParts = Object.values(parts).filter(Boolean).length;
          const progress = totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0;
          return {
            meetings: {
              ...state.meetings,
              [key]: {
                ...existing,
                parts,
                progress,
                prepared: progress === 100,
                timestamp: new Date().toISOString(),
              },
            },
          };
        }),

      initMeetingParts: (weekOf, meetingType, partKeys) =>
        set((state) => {
          const key = `${weekOf}-${meetingType}`;
          const existing = state.meetings[key] || {
            parts: {},
            progress: 0,
            prepared: false,
            timestamp: null,
          };
          const parts = { ...existing.parts };
          partKeys.forEach((k) => {
            if (!(k in parts)) parts[k] = false;
          });
          return {
            meetings: {
              ...state.meetings,
              [key]: { ...existing, parts },
            },
          };
        }),

      clearAll: () =>
        set({
          dailyTexts: {},
          prayers: {},
          familyWorship: {},
          bibleReadings: {},
          bibleChapters: {},
          meetings: {},
          weeklyReadings: {},
        }),

      pruneOldEntries: () => set((state) => pruneProgressMaps(state)),
    }),
    {
      name: 'ls-progress-storage',
      version: 2,
      migrate: migrateProgressPersistence,
      storage: createJSONStorage(() => createSafeStorage('ls-progress-storage')),
      partialize: (state) => {
        const pruned = pruneProgressMaps(state);
        return {
          dailyTexts: pruned.dailyTexts,
          prayers: pruned.prayers,
          familyWorship: pruned.familyWorship,
          bibleReadings: pruned.bibleReadings,
          bibleChapters: pruned.bibleChapters,
          meetings: pruned.meetings,
          weeklyReadings: pruned.weeklyReadings,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const pruned = pruneProgressMaps(state);
        Object.assign(state, pruned);
      },
    }
  )
);

export default useProgressStore;
