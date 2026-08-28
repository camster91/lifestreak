import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Mock date-fns before importing the store
vi.mock('date-fns', () => ({
  format: (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  startOfWeek: (date) => date,
}));

// Import after mocking
const { default: useProgressStore } = await import('./progressStore.js');

describe('progressStore', () => {
  beforeEach(() => {
    // Clear store state before each test
    act(() => {
      useProgressStore.getState().clearAll();
    });
  });

  describe('Daily Text Progress', () => {
    it('should initialize with empty daily texts', () => {
      const state = useProgressStore.getState();
      expect(state.dailyTexts).toEqual({});
    });

    it('should update daily text progress field', () => {
      const testDate = '2026-01-20';

      act(() => {
        useProgressStore.getState().updateDailyTextProgress(testDate, 'readScripture', true);
      });

      const state = useProgressStore.getState();
      expect(state.dailyTexts[testDate].readScripture).toBe(true);
      // Single checkbox model: readScripture = true means 100% progress
      expect(state.dailyTexts[testDate].progress).toBe(100);
    });

    it('should calculate 100% progress when all fields completed', () => {
      const testDate = '2026-01-20';

      act(() => {
        const store = useProgressStore.getState();
        store.updateDailyTextProgress(testDate, 'readScripture', true);
        store.updateDailyTextProgress(testDate, 'readComments', true);
        store.updateDailyTextProgress(testDate, 'meditated', true);
      });

      const state = useProgressStore.getState();
      expect(state.dailyTexts[testDate].progress).toBe(100);
      expect(state.dailyTexts[testDate].read).toBe(true);
    });

    it('should mark daily text as read', () => {
      const testDate = '2026-01-20';

      act(() => {
        useProgressStore.getState().markDailyTextRead(testDate);
      });

      const state = useProgressStore.getState();
      expect(state.dailyTexts[testDate].read).toBe(true);
      expect(state.dailyTexts[testDate].progress).toBe(100);
      expect(state.isDailyTextRead(testDate)).toBe(true);
    });

    it('should get daily text progress', () => {
      const testDate = '2026-01-20';

      act(() => {
        useProgressStore.getState().updateDailyTextProgress(testDate, 'readScripture', true);
      });

      const progress = useProgressStore.getState().getDailyTextProgress(testDate);
      expect(progress.readScripture).toBe(true);
      // Single checkbox model: only readScripture field exists
      expect(progress.progress).toBe(100);
    });
  });

  describe('Bible Reading Progress', () => {
    it('should mark bible reading complete', () => {
      const dateKey = '2026-01-20';

      act(() => {
        useProgressStore.getState().markBibleReadingComplete(dateKey);
      });

      const state = useProgressStore.getState();
      expect(state.bibleReadings[dateKey].read).toBe(true);
      expect(state.bibleReadings[dateKey].progress).toBe(100);
      expect(state.bibleReadings[dateKey].status).toBe('completed');
    });

    it('should update bible reading progress partially', () => {
      const dateKey = '2026-01-20';

      act(() => {
        useProgressStore.getState().updateBibleReadingProgress(dateKey, 50, ['Gen 1', 'Gen 2']);
      });

      const state = useProgressStore.getState();
      expect(state.bibleReadings[dateKey].progress).toBe(50);
      expect(state.bibleReadings[dateKey].chaptersRead).toEqual(['Gen 1', 'Gen 2']);
      expect(state.bibleReadings[dateKey].status).toBe('in_progress');
    });

    it('should check if bible reading is complete', () => {
      const dateKey = '2026-01-20';

      expect(useProgressStore.getState().isBibleReadingComplete(dateKey)).toBe(false);

      act(() => {
        useProgressStore.getState().markBibleReadingComplete(dateKey);
      });

      expect(useProgressStore.getState().isBibleReadingComplete(dateKey)).toBe(true);
    });

    it('should get bible reading progress percentage', () => {
      const dateKey = '2026-01-20';

      expect(useProgressStore.getState().getBibleReadingProgress(dateKey)).toBe(0);

      act(() => {
        useProgressStore.getState().updateBibleReadingProgress(dateKey, 75, []);
      });

      expect(useProgressStore.getState().getBibleReadingProgress(dateKey)).toBe(75);
    });

    it('keeps the same calendar day in different years separate', () => {
      act(() => {
        const store = useProgressStore.getState();
        store.markBibleReadingComplete('2025-01-20');
        store.updateBibleReadingProgress('2026-01-20', 50, []);
      });

      const state = useProgressStore.getState();
      expect(state.bibleReadings['2025-01-20'].progress).toBe(100);
      expect(state.bibleReadings['2026-01-20'].progress).toBe(50);
    });

    it.each([20, '20', 'legacy-day-of-year:20', '2025-02-29', '2026-1-20'])(
      'refuses invalid or yearless Bible history key %s at every boundary',
      (invalidKey) => {
        act(() => {
          const store = useProgressStore.getState();
          store.markBibleReadingComplete(invalidKey);
          store.updateBibleReadingProgress(invalidKey, 50, []);
          store.toggleBibleChapter(invalidKey, 1);
        });
        const state = useProgressStore.getState();
        expect(state.bibleReadings).not.toHaveProperty(String(invalidKey));
        expect(state.bibleChapters).not.toHaveProperty(String(invalidKey));
        expect(state.isBibleReadingComplete(invalidKey)).toBe(false);
        expect(state.getBibleReadingProgress(invalidKey)).toBe(0);
        expect(state.getBibleChapterProgress(invalidKey)).toEqual({});
      }
    );

    it('calculates a streak across December and January', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 0, 2, 12));
      act(() => {
        const store = useProgressStore.getState();
        store.markBibleReadingComplete('2025-12-31');
        store.markBibleReadingComplete('2026-01-01');
        store.markBibleReadingComplete('2026-01-02');
      });

      expect(useProgressStore.getState().getBibleReadingStreak()).toBe(3);
      expect(useProgressStore.getState().getCompletionRate('bibleReading', 3)).toBe(100);
      vi.useRealTimers();
    });

    it('keeps leap day as its own local calendar key', async () => {
      const { getLocalDateKey } = await import('./progressStore.ts');
      expect(getLocalDateKey(new Date(2024, 1, 29, 23, 30))).toBe('2024-02-29');
      expect(getLocalDateKey(new Date(2024, 2, 1, 0, 30))).toBe('2024-03-01');
    });
  });

  describe('Meeting Preparation Progress', () => {
    it('should initialize meeting parts', () => {
      const weekOf = '2026-W03';
      const meetingType = 'midweek';
      const partKeys = ['part1', 'part2', 'part3'];

      act(() => {
        useProgressStore.getState().initMeetingParts(weekOf, meetingType, partKeys);
      });

      const progress = useProgressStore.getState().getMeetingProgress(weekOf, meetingType);
      expect(progress.parts).toEqual({ part1: false, part2: false, part3: false });
    });

    it('should update meeting part progress', () => {
      const weekOf = '2026-W03';
      const meetingType = 'midweek';

      act(() => {
        useProgressStore.getState().updateMeetingPartProgress(weekOf, meetingType, 'part1', true);
        useProgressStore.getState().updateMeetingPartProgress(weekOf, meetingType, 'part2', true);
        useProgressStore.getState().updateMeetingPartProgress(weekOf, meetingType, 'part3', false);
      });

      const progress = useProgressStore.getState().getMeetingProgress(weekOf, meetingType);
      expect(progress.parts.part1).toBe(true);
      expect(progress.parts.part2).toBe(true);
      expect(progress.parts.part3).toBe(false);
      expect(progress.progress).toBe(67);
    });

    it('should mark meeting as fully prepared', () => {
      const weekOf = '2026-W03';
      const meetingType = 'weekend';

      act(() => {
        useProgressStore.getState().markMeetingPrepared(weekOf, meetingType, 45);
      });

      const state = useProgressStore.getState();
      expect(state.isMeetingPrepared(weekOf, meetingType)).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('should clear all progress data', () => {
      act(() => {
        const store = useProgressStore.getState();
        store.markDailyTextRead('2026-01-20');
        store.markBibleReadingComplete('2026-01-20');
        store.markMeetingPrepared('2026-W03', 'midweek');
        store.clearAll();
      });

      const state = useProgressStore.getState();
      expect(state.dailyTexts).toEqual({});
      expect(state.bibleReadings).toEqual({});
      expect(state.meetings).toEqual({});
    });
  });
});

describe('pruneRecordBySortedKeys / pruneProgressMaps', () => {
  it('keeps only the newest N keys', async () => {
    const { pruneRecordBySortedKeys, MAX_DAILY_PROGRESS_ENTRIES } =
      await import('./progressStore.ts');
    const iso = {};
    for (let i = 0; i < MAX_DAILY_PROGRESS_ENTRIES + 10; i++) {
      const d = new Date(Date.UTC(2020, 0, 1 + i));
      iso[d.toISOString().slice(0, 10)] = { n: i };
    }
    const pruned = pruneRecordBySortedKeys(iso, MAX_DAILY_PROGRESS_ENTRIES);
    expect(Object.keys(pruned).length).toBe(MAX_DAILY_PROGRESS_ENTRIES);
  });
});

describe('progress persistence migration', () => {
  it('preserves yearless Bible history in an explicit quarantine namespace', async () => {
    const { migrateProgressPersistence, LEGACY_BIBLE_DAY_PREFIX } =
      await import('./progressStore.ts');
    const reading = { progress: 100, read: true };
    const migrated = migrateProgressPersistence(
      {
        bibleReadings: { 60: reading, '2024-02-29': reading },
        bibleChapters: { 60: { 1: true } },
      },
      0
    );

    expect(migrated.bibleReadings[`${LEGACY_BIBLE_DAY_PREFIX}60`]).toEqual(reading);
    expect(migrated.bibleReadings['2024-02-29']).toEqual(reading);
    expect(migrated.bibleChapters[`${LEGACY_BIBLE_DAY_PREFIX}60`]).toEqual({ 1: true });
  });
});
