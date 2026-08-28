import { describe, expect, it } from 'vitest';
import {
  isValidReadingDateKey,
  normalizeReadingPersistence,
  readingItemPercent,
  summarizeReadingProgress,
} from './readingStore';

const item = (overrides = {}) => ({
  id: 1,
  title: 'Example',
  type: 'book' as const,
  totalUnits: 10,
  completedUnits: 0,
  startedDate: '2026-08-28',
  notes: '',
  unitLabel: 'chapters' as const,
  ...overrides,
});

describe('truthful reading progress', () => {
  it('uses the same item percentage contract as reading detail', () => {
    const active = item({ completedUnits: 3, totalUnits: 4 });
    expect(readingItemPercent(active)).toBe(75);
    expect(summarizeReadingProgress([active]).percent).toBe(75);
  });

  it('averages mixed active item percentages instead of adding unlike units', () => {
    const summary = summarizeReadingProgress([
      item({ id: 1, completedUnits: 5, totalUnits: 10, unitLabel: 'chapters' }),
      item({ id: 2, completedUnits: 90, totalUnits: 100, unitLabel: 'minutes' }),
    ]);
    expect(summary).toMatchObject({ activeCount: 2, percent: 70, hasUnknownRecords: false });
  });

  it('defines empty, completed-only, and quarantined states without fabricated percentages', () => {
    expect(summarizeReadingProgress([])).toEqual({
      activeCount: 0,
      percent: null,
      hasUnknownRecords: false,
    });
    expect(
      summarizeReadingProgress([item({ finishedDate: '2026-08-28', completedUnits: 10 })])
    ).toMatchObject({
      activeCount: 0,
      percent: null,
    });
    expect(summarizeReadingProgress([], [{ title: 'malformed' }])).toEqual({
      activeCount: 0,
      percent: null,
      hasUnknownRecords: true,
    });
  });

  it('quarantines impossible dates, reversed ranges, and duplicate stable IDs', () => {
    expect(isValidReadingDateKey('2024-02-29')).toBe(true);
    expect(isValidReadingDateKey('2025-02-29')).toBe(false);
    const valid = item({ id: 7, startedDate: '2026-08-01' });
    const duplicate = { ...valid, title: 'Duplicate raw item' };
    const impossible = { ...valid, id: 8, startedDate: '2026-02-30' };
    const reversed = {
      ...valid,
      id: 9,
      startedDate: '2026-08-10',
      finishedDate: '2026-08-09',
    };

    const normalized = normalizeReadingPersistence({
      items: [valid, duplicate, impossible, reversed],
    });
    expect(normalized.items).toEqual([valid]);
    expect(normalized.quarantinedItems).toEqual([duplicate, impossible, reversed]);
  });
});
