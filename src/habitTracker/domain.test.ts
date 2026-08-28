import { describe, expect, it } from 'vitest';
import { assertValidHabitDatabase, migrateHabitDatabase } from './domain';

const database = () => ({
  version: 1,
  habits: [
    {
      id: 'habit-1',
      name: 'Walk',
      description: '',
      category: 'Health',
      timeOfDay: 'afternoon',
      startDate: '2026-08-28',
      schedule: { type: 'daily', anchorDate: '2026-08-28' },
      tracking: { type: 'duration', target: 20, unit: 'min' },
      lifecycleState: 'active',
      lifecycleHistory: [],
      revisions: [],
      createdAt: '2026-08-28T12:00:00.000Z',
      updatedAt: '2026-08-28T12:00:00.000Z',
    },
  ],
  logs: [
    {
      id: 'log-1',
      habitId: 'habit-1',
      date: '2026-08-28',
      explicitStatus: null,
      entries: [
        {
          id: 'entry-1',
          value: 20,
          unit: 'min',
          createdAt: '2026-08-28T12:00:00.000Z',
        },
      ],
      note: '',
      createdAt: '2026-08-28T12:00:00.000Z',
      updatedAt: '2026-08-28T12:00:00.000Z',
    },
  ],
  preferences: {},
  onboarding: {},
  legacy: {},
  updatedAt: '2026-08-28T12:00:00.000Z',
});

describe('habit domain schema', () => {
  it('accepts a binary/measurable source-record database and migrates v1 idempotently', () => {
    const candidate = database();
    expect(() => assertValidHabitDatabase(candidate)).not.toThrow();
    expect(migrateHabitDatabase(candidate)).toBe(candidate);
    expect(migrateHabitDatabase(migrateHabitDatabase(candidate))).toBe(candidate);
  });

  it('rejects duplicate habit/date logs', () => {
    const candidate = database();
    candidate.logs.push({ ...candidate.logs[0], id: 'log-2' });
    expect(() => assertValidHabitDatabase(candidate)).toThrow(/duplicate habit\/date/i);
  });

  it('rejects invalid local dates and orphaned logs', () => {
    const invalidDate = database();
    invalidDate.logs[0].date = '2026-02-30';
    expect(() => assertValidHabitDatabase(invalidDate)).toThrow(/domain schema/i);

    const orphan = database();
    orphan.logs[0].habitId = 'habit-missing';
    expect(() => assertValidHabitDatabase(orphan)).toThrow(/domain schema/i);
  });
});
