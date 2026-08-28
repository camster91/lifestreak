import { describe, expect, it } from 'vitest';
import { assertValidHabitDatabase, migrateHabitDatabase } from './domain';

const database = (): any => ({
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

  it.each([
    ['schedule anchor', (value: any) => (value.habits[0].schedule.anchorDate = '2026-02-30')],
    ['tracking target', (value: any) => (value.habits[0].tracking.target = Number.NaN)],
    ['habit timestamp', (value: any) => (value.habits[0].updatedAt = 'not-a-timestamp')],
    ['log note', (value: any) => (value.logs[0].note = null)],
    ['entry unit', (value: any) => (value.logs[0].entries[0].unit = '')],
    ['entry timestamp', (value: any) => (value.logs[0].entries[0].createdAt = 'yesterday')],
  ])('rejects corrupted nested %s data', (_label, corrupt) => {
    const candidate = database();
    corrupt(candidate);
    expect(() => assertValidHabitDatabase(candidate)).toThrow();
  });

  it('validates lifecycle and revision identity, dates, configuration, and timestamps', () => {
    const valid = database();
    valid.habits[0].lifecycleHistory = [
      {
        id: 'lifecycle-1',
        state: 'paused',
        effectiveDate: '2026-08-29',
        createdAt: '2026-08-28T13:00:00.000Z',
      },
    ];
    valid.habits[0].revisions = [
      {
        id: 'revision-1',
        effectiveDate: '2026-08-30',
        schedule: { type: 'weekdays', weekdays: [1, 3, 5], anchorDate: '2026-08-28' },
        tracking: { type: 'duration', target: 30, unit: 'min' },
        timeOfDay: 'morning',
        createdAt: '2026-08-28T14:00:00.000Z',
      },
    ];
    expect(() => assertValidHabitDatabase(valid)).not.toThrow();

    const duplicateDate = structuredClone(valid);
    duplicateDate.habits[0].revisions.push({
      ...duplicateDate.habits[0].revisions[0],
      id: 'revision-2',
    });
    expect(() => assertValidHabitDatabase(duplicateDate)).toThrow(/invalid revision/i);

    const badLifecycle = structuredClone(valid);
    badLifecycle.habits[0].lifecycleHistory[0].state = 'deleted';
    expect(() => assertValidHabitDatabase(badLifecycle)).toThrow(/lifecycle/i);

    const badRevision = structuredClone(valid);
    badRevision.habits[0].revisions[0].schedule.weekdays = [];
    expect(() => assertValidHabitDatabase(badRevision)).toThrow(/weekdays/i);
  });
});
