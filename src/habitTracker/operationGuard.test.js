import { beforeEach, describe, expect, it } from 'vitest';
import './operationGuard';
import { habitStore } from './store';

const measurableHabit = {
  name: 'Water',
  startDate: '2026-08-28',
  timeOfDay: 'anytime',
  schedule: { type: 'daily', anchorDate: '2026-08-28' },
  tracking: { type: 'volume', target: 8, unit: 'cups' },
};

describe('operation duplicate guard', () => {
  beforeEach(() => habitStore.resetAllData());

  it('coalesces identical rapid value submissions into one source entry', () => {
    const habitId = habitStore.createHabit(measurableHabit);

    expect(habitStore.addValue(habitId, '2026-08-28', 2, 'cups')).toBe(true);
    expect(habitStore.addValue(habitId, '2026-08-28', 2, 'cups')).toBe(true);

    expect(habitStore.getSnapshot().logs[0].entries).toHaveLength(1);
  });
});
