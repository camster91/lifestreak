import { describe, expect, it } from 'vitest';
import {
  getServicePeriodTotals,
  isValidLocalDateKey,
  normalizeServicePersistence,
} from './serviceStore';

const entry = (date: string, hours: number) => ({
  id: Math.random(),
  date,
  hours,
  type: 'field' as const,
  notes: '',
});

describe('service calendar totals', () => {
  it('includes local week and month boundaries and excludes prior periods', () => {
    const totals = getServicePeriodTotals(
      [entry('2026-08-01', 1), entry('2026-08-24', 2), entry('2026-08-28', 3)],
      new Date(2026, 7, 28, 23, 30)
    );
    expect(totals).toEqual({ weekly: 5, monthly: 6 });
  });

  it('does not count future or invalid entries', () => {
    const totals = getServicePeriodTotals(
      [
        entry('2026-08-28', 1),
        entry('2026-08-29', 20),
        entry('2026-02-30', 30),
        entry('not-a-date', 40),
      ],
      new Date(2026, 7, 28, 12)
    );
    expect(totals).toEqual({ weekly: 1, monthly: 1 });
  });

  it('validates leap days deterministically', () => {
    expect(isValidLocalDateKey('2024-02-29')).toBe(true);
    expect(isValidLocalDateKey('2025-02-29')).toBe(false);
  });

  it('uses Monday as the start of the week across a year boundary', () => {
    const totals = getServicePeriodTotals(
      [entry('2025-12-29', 1), entry('2025-12-31', 2), entry('2026-01-01', 3)],
      new Date(2026, 0, 1, 12)
    );
    expect(totals).toEqual({ weekly: 6, monthly: 3 });
  });

  it('quarantines malformed dates and duplicate stable IDs without discarding raw records', () => {
    const valid = entry('2026-08-28', 2);
    valid.id = 7;
    const duplicate = { ...valid, hours: 9, notes: 'duplicate raw record' };
    const invalidDate = { ...entry('2026-02-30', 4), id: 8, notes: 'invalid date raw record' };

    const normalized = normalizeServicePersistence({
      entries: [valid, duplicate, invalidDate],
      weeklyGoal: 4,
      monthlyGoal: 16,
    });

    expect(normalized.entries).toEqual([valid]);
    expect(normalized.quarantinedEntries).toEqual([duplicate, invalidDate]);
  });
});
