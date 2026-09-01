import { beforeEach, describe, expect, it } from 'vitest';
import { habitStore } from './store';
import { addDays, toLocalDate } from './engine';

const input = (name = 'Walk') => ({
  name,
  icon: '🚶',
  startDate: '2026-08-28',
  timeOfDay: 'afternoon',
  schedule: { type: 'daily', anchorDate: '2026-08-28' },
  tracking: { type: 'binary' },
});

describe('habit management', () => {
  beforeEach(() => habitStore.resetAllData());

  it('allows duplicate names while stable IDs keep histories separate', () => {
    const first = habitStore.createHabit(input());
    const second = habitStore.createHabit(input());
    expect(first).not.toBe(second);
    habitStore.setDayStatus(first, '2026-08-28', 'completed');

    expect(habitStore.getSnapshot().habits.filter(({ name }) => name === 'Walk')).toHaveLength(2);
    expect(habitStore.getSnapshot().logs).toMatchObject([
      { habitId: first, date: '2026-08-28', explicitStatus: 'completed' },
    ]);
  });

  it('duplicates configuration and icon into a new habit without copying history', () => {
    const sourceId = habitStore.createHabit(input());
    habitStore.setDayStatus(sourceId, '2026-08-28', 'completed');
    const duplicateId = habitStore.duplicateHabit(sourceId);
    const duplicate = habitStore.getSnapshot().habits.find(({ id }) => id === duplicateId);

    expect(duplicate).toMatchObject({ name: 'Walk copy', icon: '🚶' });
    expect(duplicateId).not.toBe(sourceId);
    expect(habitStore.getSnapshot().logs.some(({ habitId }) => habitId === duplicateId)).toBe(
      false
    );
  });

  it('corrects and removes source entries without creating phantom logs', () => {
    const habitId = habitStore.createHabit({
      ...input('Water'),
      tracking: { type: 'volume', target: 8, unit: 'cups' },
    });
    habitStore.addValue(habitId, '2026-08-28', 2, 'cups');
    const entryId = habitStore.getSnapshot().logs[0].entries[0].id;

    expect(habitStore.updateValue(habitId, '2026-08-28', entryId, 3.5)).toBe(true);
    expect(habitStore.getSnapshot().logs[0].entries[0].value).toBe(3.5);
    expect(habitStore.updateValue(habitId, '2026-08-28', 'missing', 4)).toBe(false);
    expect(habitStore.removeValue(habitId, '2026-08-27', 'missing')).toBe(false);
    expect(habitStore.getSnapshot().logs).toHaveLength(1);
  });

  it('does not report success for no-op moves or empty-day clears', () => {
    const habitId = habitStore.createHabit(input());
    expect(habitStore.moveHabit(habitId, 'up')).toBe(false);
    expect(habitStore.getSnapshot().operation).toMatchObject({
      type: 'warning',
      message: 'Nothing changed.',
    });
    expect(habitStore.clearDay(habitId, '2026-08-28')).toBe(false);
    expect(habitStore.getSnapshot().logs).toEqual([]);
  });

  it('does not report success or create records for repeated habit operations', () => {
    const today = toLocalDate();
    const habitId = habitStore.createHabit({
      ...input('Stable habit'),
      startDate: today,
      schedule: { type: 'daily', anchorDate: today },
    });

    expect(habitStore.updateHabit(habitId, { name: 'Stable habit' })).toBe(false);
    expect(habitStore.setLifecycle(habitId, 'active', today)).toBe(false);
    expect(habitStore.setNote(habitId, today, '')).toBe(false);
    expect(habitStore.getSnapshot().logs).toEqual([]);

    expect(habitStore.setDayStatus(habitId, today, 'completed')).toBe(true);
    const afterCompletion = structuredClone(habitStore.getSnapshot().logs);
    expect(habitStore.setDayStatus(habitId, today, 'completed')).toBe(false);
    expect(habitStore.getSnapshot().logs).toEqual(afterCompletion);

    expect(habitStore.setNote(habitId, today, 'Kept going')).toBe(true);
    expect(habitStore.setNote(habitId, today, 'Kept going')).toBe(false);
  });

  it('does not report success for repeated preference and onboarding actions', () => {
    const initialPreference = habitStore.getSnapshot().preferences.reduceMotion;
    expect(habitStore.setPreference('reduceMotion', initialPreference)).toBe(false);
    expect(habitStore.dismissOnboarding()).toBe(true);
    expect(habitStore.dismissOnboarding()).toBe(false);
  });

  it('refuses malformed, future, not-started, and inactive new logs', () => {
    const today = toLocalDate();
    const futureHabitId = habitStore.createHabit({
      ...input('Future habit'),
      startDate: '2099-01-01',
      schedule: { type: 'daily', anchorDate: '2099-01-01' },
    });
    expect(habitStore.setDayStatus(futureHabitId, '2099-01-01', 'completed')).toBe(false);
    expect(habitStore.setNote(futureHabitId, 'not-a-date', 'No phantom note')).toBe(false);

    const inactiveId = habitStore.createHabit(input('Inactive habit'));
    expect(habitStore.setLifecycle(inactiveId, 'paused', today)).toBe(true);
    expect(habitStore.setDayStatus(inactiveId, today, 'completed')).toBe(false);
    expect(habitStore.getSnapshot().logs).toEqual([]);
  });

  it('uses the effective tracking unit and still permits deliberate off-schedule history', () => {
    const habitId = habitStore.createHabit({
      ...input('Water'),
      schedule: { type: 'weekdays', weekdays: [1], anchorDate: '2026-08-28' },
      tracking: { type: 'volume', target: 8, unit: 'cups' },
    });
    expect(habitStore.addValue(habitId, '2026-08-28', 2, 'litres')).toBe(true);
    expect(habitStore.getSnapshot().logs[0]).toMatchObject({
      date: '2026-08-28',
      entries: [{ value: 2, unit: 'cups' }],
    });
  });

  it('does not reinterpret existing progress under a new target or unit', () => {
    const today = toLocalDate();
    const habitId = habitStore.createHabit({
      ...input('Distance'),
      startDate: today,
      schedule: { type: 'daily', anchorDate: today },
      tracking: { type: 'distance', target: 5, unit: 'km' },
    });
    expect(habitStore.addValue(habitId, today, 2)).toBe(true);
    const before = structuredClone(habitStore.getSnapshot());

    expect(
      habitStore.updateHabit(habitId, {
        tracking: { type: 'distance', target: 10, unit: 'miles' },
      })
    ).toBe(false);
    expect(habitStore.getSnapshot().habits).toEqual(before.habits);
    expect(habitStore.getSnapshot().logs).toEqual(before.logs);
    expect(habitStore.getSnapshot().operation).toMatchObject({
      type: 'error',
      message: expect.stringMatching(/clear that day|future date/i),
    });
  });

  it.each([
    ['unsupported schedule', { schedule: { type: 'sometimes', anchorDate: '2026-08-28' } }],
    [
      'weekly target above seven',
      { schedule: { type: 'timesPerWeek', timesPerWeek: 8, anchorDate: '2026-08-28' } },
    ],
    [
      'fractional interval',
      { schedule: { type: 'interval', intervalDays: 1.5, anchorDate: '2026-08-28' } },
    ],
    [
      'impossible end date',
      { schedule: { type: 'daily', anchorDate: '2026-08-28', endDate: '2026-02-30' } },
    ],
    ['unsupported tracking', { tracking: { type: 'mood', target: 1, unit: 'point' } }],
    ['missing measurable unit', { tracking: { type: 'count', target: 5, unit: '' } }],
    [
      'stretch below minimum',
      { tracking: { type: 'duration', target: 20, stretchTarget: 10, unit: 'min' } },
    ],
  ])('rejects %s instead of silently normalizing it', (_label, overrides) => {
    expect(() => habitStore.createHabit({ ...input('Invalid fixture'), ...overrides })).toThrow();
    expect(habitStore.getSnapshot().habits).toEqual([]);
  });

  it('rejects an invalid schedule edit without changing the habit or its history', () => {
    const habitId = habitStore.createHabit(input('Stable routine'));
    habitStore.setDayStatus(habitId, '2026-08-28', 'completed');
    const before = structuredClone(habitStore.getSnapshot());

    expect(() =>
      habitStore.updateHabit(habitId, {
        schedule: { type: 'monthlyTarget', monthlyTarget: 0, anchorDate: '2026-08-28' },
      })
    ).toThrow(/month/i);
    expect(habitStore.getSnapshot()).toEqual(before);
  });

  it('prevents backdated configuration and non-current lifecycle changes', () => {
    const today = toLocalDate();
    const yesterday = addDays(today, -1);
    const tomorrow = addDays(today, 1);
    const habitId = habitStore.createHabit({
      ...input('Prospective routine'),
      startDate: today,
      schedule: { type: 'daily', anchorDate: today },
    });
    const before = structuredClone(habitStore.getSnapshot());

    expect(() =>
      habitStore.updateHabit(
        habitId,
        { schedule: { type: 'timesPerWeek', timesPerWeek: 2, anchorDate: today } },
        yesterday
      )
    ).toThrow(/today or later/i);
    expect(habitStore.getSnapshot()).toEqual(before);
    expect(habitStore.setLifecycle(habitId, 'paused', yesterday)).toBe(false);
    expect(habitStore.setLifecycle(habitId, 'paused', tomorrow)).toBe(false);
    expect(habitStore.currentLifecycle(habitId, today)).toBe('active');

    expect(
      habitStore.updateHabit(
        habitId,
        { schedule: { type: 'timesPerWeek', timesPerWeek: 2, anchorDate: today } },
        tomorrow
      )
    ).toBe(true);
    expect(habitStore.getSnapshot().habits[0].revisions).toHaveLength(1);
  });
});
