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
