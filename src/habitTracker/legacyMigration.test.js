import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { classifyLegacyRecord, habitStore, LEGACY_BACKUP_PREFIX } from './store';

const serviceEnvelope = JSON.stringify({
  state: { entries: [], weeklyGoal: 4, monthlyGoal: 16 },
  version: 1,
});
const progressEnvelope = JSON.stringify({
  state: { dailyTexts: {}, prayers: {}, bibleReadings: {}, weeklyReadings: {} },
  version: 1,
});

const historicalFixtures = [
  {
    source: 'jw-progress-storage',
    successor: 'ls-progress-storage',
    envelope: {
      state: {
        dailyTexts: { '2026-02-28': { read: true, progress: 100, timestamp: 'preserved' } },
        prayers: { '2026-02-28': { morning: true, afternoon: false, evening: true } },
        familyWorship: {
          '2026-02-23': {
            completed: true,
            topic: 'Family topic',
            notes: 'Private family note',
            studyLinks: [{ id: 'link-1', title: 'Reference', url: 'https://www.jw.org/' }],
          },
        },
        bibleReadings: { 59: { read: true, progress: 100, chaptersRead: [1, 2] } },
        bibleChapters: { 59: { 1: true, 2: true } },
        meetings: { '2026-02-23-midweek': { prepared: true, parts: { treasures: true } } },
        weeklyReadings: { '2026-02-23': { completed: true, totalChapters: 4 } },
      },
      version: 0,
    },
  },
  {
    source: 'jw-progress-settings',
    successor: 'ls-progress-settings',
    envelope: {
      state: {
        notifications: { enabled: false },
        bibleReadingSchedule: { startingScheduleDay: 2, readingPace: 3 },
        theme: 'dark',
      },
      version: 0,
    },
  },
  {
    source: 'jw-gamification-storage',
    successor: 'ls-gamification-storage',
    envelope: {
      state: { points: 875, currentStreak: 12, unlockedAchievements: ['week_1'] },
      version: 1,
    },
  },
  {
    source: 'jw-goals-storage',
    successor: 'ls-goals-storage',
    envelope: {
      state: {
        goals: [{ id: 'goal-1', title: 'Preserved goal', progress: 40, completed: false }],
        projects: [
          {
            id: 'project-1',
            title: 'Preserved project',
            tasks: [{ id: 'task-1', title: 'Private task', completed: true }],
          },
        ],
      },
      version: 2,
    },
  },
  {
    source: 'jw-memories-storage',
    successor: 'ls-memories-storage',
    envelope: {
      state: {
        reflections: {
          '2024-02-29': {
            content: 'Private leap-day reflection',
            createdAt: '2024-02-29T12:00:00.000Z',
            updatedAt: '2024-03-01T12:00:00.000Z',
          },
        },
      },
      version: 1,
    },
  },
].map((fixture) => ({ ...fixture, raw: JSON.stringify(fixture.envelope) }));

const checksum = (value) => createHash('sha256').update(value).digest('hex');

describe('legacy storage classification', () => {
  it('preserves a valid current specialist store', () => {
    expect(classifyLegacyRecord('ls-service-storage', serviceEnvelope)).toMatchObject({
      status: 'preserved',
      successor: null,
    });
  });

  it('offers a valid historical store only when its successor is absent', () => {
    expect(classifyLegacyRecord('jw-progress-storage', progressEnvelope, [])).toMatchObject({
      status: 'migration-candidate',
      successor: 'ls-progress-storage',
    });
    expect(
      classifyLegacyRecord('jw-progress-storage', progressEnvelope, ['ls-progress-storage'])
    ).toMatchObject({ status: 'conflict' });
  });

  it.each(historicalFixtures)(
    'recognizes the supported $source fixture as a migration candidate',
    ({ source, successor, raw }) => {
      expect(classifyLegacyRecord(source, raw, [])).toMatchObject({
        status: 'migration-candidate',
        successor,
      });
    }
  );

  it('quarantines unknown future specialist-store versions', () => {
    const future = JSON.stringify({
      state: { dailyTexts: {}, prayers: {}, bibleReadings: {}, weeklyReadings: {} },
      version: 999,
    });
    expect(classifyLegacyRecord('jw-progress-storage', future, [])).toMatchObject({
      status: 'quarantined',
      reason: expect.stringMatching(/unsupported store version/i),
    });
  });

  it.each([
    ['ls-reading-storage', '[object Object]', 'unsafe object-to-string'],
    ['ls-reading-storage', '{broken', 'not valid JSON'],
    ['ls-reading-storage', JSON.stringify({ items: [] }), 'state envelope'],
    ['mystery-progress', progressEnvelope, 'no verified schema'],
  ])('quarantines unsafe %s values', (key, raw, reason) => {
    const result = classifyLegacyRecord(key, raw);
    expect(result.status).toBe('quarantined');
    expect(result.reason).toContain(reason);
  });

  it('keeps auxiliary preferences outside personal-history migration', () => {
    expect(classifyLegacyRecord('dailyReminderTime', '{"hour":7,"minute":0}')).toMatchObject({
      status: 'operational',
    });
    expect(
      classifyLegacyRecord('installPromptDismissed', '2026-09-04T12:00:00.000Z')
    ).toMatchObject({ status: 'operational' });
  });

  it('recognizes an identical successor as an idempotently completed migration', () => {
    expect(
      classifyLegacyRecord(
        'jw-progress-storage',
        progressEnvelope,
        ['ls-progress-storage'],
        progressEnvelope
      )
    ).toMatchObject({ status: 'migrated' });
  });

  it('creates and verifies a recovery copy before copying a historical store', () => {
    localStorage.setItem('jw-progress-storage', progressEnvelope);
    habitStore.scanLegacyData();

    expect(habitStore.migrateHistoricalStore('jw-progress-storage')).toBe(true);
    expect(localStorage.getItem('jw-progress-storage')).toBe(progressEnvelope);
    expect(localStorage.getItem('ls-progress-storage')).toBe(progressEnvelope);
    const backupKey = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index)
    ).find((key) => key?.startsWith(LEGACY_BACKUP_PREFIX));
    expect(backupKey).toBeDefined();
    expect(JSON.parse(localStorage.getItem(backupKey)).rawValue).toBe(progressEnvelope);
    expect(habitStore.migrateHistoricalStore('jw-progress-storage')).toBe(true);
  });

  it('preserves every historical store fixture byte-for-byte with a distinct recovery copy', () => {
    historicalFixtures.forEach(({ source, raw }) => localStorage.setItem(source, raw));
    habitStore.scanLegacyData();

    historicalFixtures.forEach(({ source, successor, raw }) => {
      expect(habitStore.migrateHistoricalStore(source)).toBe(true);
      expect(checksum(localStorage.getItem(source))).toBe(checksum(raw));
      expect(checksum(localStorage.getItem(successor))).toBe(checksum(raw));
    });

    const recoveryKeys = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index)
    ).filter((key) => key?.startsWith(LEGACY_BACKUP_PREFIX));
    expect(recoveryKeys).toHaveLength(historicalFixtures.length);
    historicalFixtures.forEach(({ source, raw }) => {
      const key = recoveryKeys.find((candidate) => candidate.includes(source));
      expect(key).toBeDefined();
      expect(checksum(JSON.parse(localStorage.getItem(key)).rawValue)).toBe(checksum(raw));
    });
  });

  it('requires typed approval and exact successor/recovery verification before cleanup', () => {
    localStorage.setItem('jw-progress-storage', progressEnvelope);
    habitStore.scanLegacyData();
    expect(habitStore.migrateHistoricalStore('jw-progress-storage')).toBe(true);
    const recoveryKey = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index)
    ).find((key) => key?.startsWith(`${LEGACY_BACKUP_PREFIX}jw-progress-storage-`));

    expect(habitStore.cleanupHistoricalStore('jw-progress-storage', 'REMOVE')).toBe(false);
    expect(localStorage.getItem('jw-progress-storage')).toBe(progressEnvelope);

    localStorage.setItem('ls-progress-storage', `${progressEnvelope} `);
    expect(
      habitStore.cleanupHistoricalStore('jw-progress-storage', 'REMOVE jw-progress-storage')
    ).toBe(false);
    expect(localStorage.getItem('jw-progress-storage')).toBe(progressEnvelope);

    localStorage.setItem('ls-progress-storage', progressEnvelope);
    expect(
      habitStore.cleanupHistoricalStore('jw-progress-storage', 'REMOVE jw-progress-storage')
    ).toBe(true);
    expect(localStorage.getItem('jw-progress-storage')).toBeNull();
    expect(localStorage.getItem('ls-progress-storage')).toBe(progressEnvelope);
    expect(localStorage.getItem(recoveryKey)).not.toBeNull();
    expect(
      habitStore
        .getSnapshot()
        .legacy.migrationRecords.find((record) => record.key === 'jw-progress-storage')
    ).toMatchObject({ status: 'cleaned', backupKey: recoveryKey });
  });

  it('leaves a divergent successor untouched and reports a conflict', () => {
    localStorage.setItem('jw-progress-storage', progressEnvelope);
    localStorage.setItem(
      'ls-progress-storage',
      JSON.stringify({ state: { dailyTexts: { changed: true } }, version: 2 })
    );
    const before = localStorage.getItem('ls-progress-storage');
    habitStore.scanLegacyData();

    expect(habitStore.migrateHistoricalStore('jw-progress-storage')).toBe(false);
    expect(localStorage.getItem('ls-progress-storage')).toBe(before);
  });

  it('preserves the source and verified backup when copying is interrupted', () => {
    localStorage.setItem('jw-progress-storage', progressEnvelope);
    habitStore.scanLegacyData();
    const normalSetItem = localStorage.setItem.getMockImplementation();
    localStorage.setItem.mockImplementation((key, value) => {
      if (key === 'ls-progress-storage')
        throw new DOMException('interrupted', 'QuotaExceededError');
      return normalSetItem(key, value);
    });

    expect(habitStore.migrateHistoricalStore('jw-progress-storage')).toBe(false);
    expect(localStorage.getItem('jw-progress-storage')).toBe(progressEnvelope);
    expect(localStorage.getItem('ls-progress-storage')).toBeNull();
    expect(
      Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).some(
        (key) => key?.startsWith(LEGACY_BACKUP_PREFIX)
      )
    ).toBe(true);
  });
});
