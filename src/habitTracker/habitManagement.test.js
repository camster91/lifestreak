import { beforeEach, describe, expect, it } from 'vitest';
import { habitStore } from './store';

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
});
