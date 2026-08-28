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
});
