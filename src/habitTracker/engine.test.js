import { describe, expect, it } from 'vitest';
import {
  addDays,
  calculateHabitStats,
  configurationForDate,
  explainStreak,
  getDayState,
  getSchedulePeriodProgress,
  isScheduledOnDate,
  parseLocalDate,
  startOfWeek,
} from './engine';

function habit(overrides = {}) {
  return {
    id: 'habit-1',
    name: 'Test habit',
    category: 'Test',
    timeOfDay: 'anytime',
    startDate: '2026-01-01',
    schedule: { type: 'daily', anchorDate: '2026-01-01' },
    tracking: { type: 'binary' },
    lifecycleState: 'active',
    lifecycleHistory: [],
    revisions: [],
    ...overrides,
  };
}

function log(date, explicitStatus = 'completed', entries = []) {
  return {
    id: `log-${date}`,
    habitId: 'habit-1',
    date,
    explicitStatus,
    entries,
  };
}

describe('local calendar utilities', () => {
  it('handles leap days and year boundaries without UTC conversion', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(parseLocalDate('2026-08-17').getDate()).toBe(17);
  });

  it('supports configurable week starts', () => {
    expect(startOfWeek('2026-08-19', 1)).toBe('2026-08-17');
    expect(startOfWeek('2026-08-19', 0)).toBe('2026-08-16');
  });
});

describe('schedule evaluation', () => {
  it('distinguishes scheduled and unscheduled weekdays', () => {
    const weekdayHabit = habit({
      schedule: { type: 'weekdays', weekdays: [1, 3, 5], anchorDate: '2026-01-01' },
    });
    expect(isScheduledOnDate(weekdayHabit, '2026-08-17')).toBe(true);
    expect(isScheduledOnDate(weekdayHabit, '2026-08-18')).toBe(false);
  });

  it('evaluates interval schedules from a local anchor date', () => {
    const intervalHabit = habit({
      schedule: { type: 'interval', intervalDays: 3, anchorDate: '2026-08-01' },
    });
    expect(isScheduledOnDate(intervalHabit, '2026-08-04')).toBe(true);
    expect(isScheduledOnDate(intervalHabit, '2026-08-05')).toBe(false);
  });

  it('keeps the completion that satisfies a weekly target on schedule', () => {
    const flexible = habit({
      schedule: { type: 'timesPerWeek', timesPerWeek: 2, anchorDate: '2026-01-01' },
    });
    const logs = [log('2026-08-17'), log('2026-08-19')];
    expect(isScheduledOnDate(flexible, '2026-08-19', logs, 1)).toBe(true);
    expect(isScheduledOnDate(flexible, '2026-08-20', logs, 1)).toBe(false);
  });

  it('keeps future dates from becoming due', () => {
    const state = getDayState(habit(), [], '2026-08-18', { today: '2026-08-17' });
    expect(state.status).toBe('future');
  });

  it('does not let future-dated logs satisfy the current weekly target', () => {
    const flexible = habit({
      schedule: { type: 'timesPerWeek', timesPerWeek: 1, anchorDate: '2026-01-01' },
    });
    const state = getDayState(flexible, [log('2026-08-21')], '2026-08-17', {
      today: '2026-08-17',
      weekStartsOn: 1,
    });
    expect(state.status).toBe('due');
  });

  it('supports a once-per-week window on selected weekdays', () => {
    const weekly = habit({
      schedule: { type: 'weekly', weekdays: [2, 4], anchorDate: '2026-01-01' },
    });
    expect(isScheduledOnDate(weekly, '2026-08-17')).toBe(false);
    expect(isScheduledOnDate(weekly, '2026-08-18')).toBe(true);
    expect(isScheduledOnDate(weekly, '2026-08-20')).toBe(true);
    expect(isScheduledOnDate(weekly, '2026-08-20', [log('2026-08-18')])).toBe(false);
  });

  it('supports monthly targets and optional end dates', () => {
    const monthly = habit({
      schedule: {
        type: 'monthlyTarget',
        monthlyTarget: 2,
        anchorDate: '2026-01-01',
        endDate: '2026-08-20',
      },
    });
    expect(isScheduledOnDate(monthly, '2026-08-18', [log('2026-08-03')])).toBe(true);
    expect(isScheduledOnDate(monthly, '2026-08-18', [log('2026-08-03'), log('2026-08-10')])).toBe(
      false
    );
    expect(isScheduledOnDate(monthly, '2026-08-21')).toBe(false);
  });

  it('explains remaining weekly opportunities from the same schedule engine', () => {
    const weekly = habit({
      schedule: { type: 'weekly', weekdays: [2, 4, 6], anchorDate: '2026-01-01' },
    });
    const progress = getSchedulePeriodProgress(weekly, [log('2026-08-18')], '2026-08-19', {
      today: '2026-08-19',
      weekStartsOn: 1,
    });
    expect(progress).toMatchObject({ target: 1, completed: 1, remaining: 0, availableDays: 2 });
  });

  it('calculates monthly-target statistics by month rather than by day', () => {
    const monthly = habit({
      schedule: { type: 'monthlyTarget', monthlyTarget: 2, anchorDate: '2026-01-01' },
    });
    const stats = calculateHabitStats(
      monthly,
      [log('2026-07-02'), log('2026-07-20'), log('2026-08-03')],
      { endDate: '2026-08-17', today: '2026-08-17', days: 48 }
    );
    expect(stats).toMatchObject({ expected: 2, completed: 1, partial: 1, missed: 0 });
    expect(stats.completionRate).toBe(50);
  });

  it('marks a finished month with an unmet target as one missed period', () => {
    const monthly = habit({
      schedule: { type: 'monthlyTarget', monthlyTarget: 3, anchorDate: '2026-01-01' },
    });
    const stats = calculateHabitStats(monthly, [log('2026-07-02')], {
      endDate: '2026-08-17',
      today: '2026-08-17',
      days: 48,
    });
    expect(stats).toMatchObject({ expected: 2, completed: 0, partial: 1, missed: 1 });
    expect(explainStreak(stats)).toContain('monthly target missed');
  });
});

describe('historical configuration', () => {
  it('does not reinterpret prior targets or units after an edit', () => {
    const changing = habit({
      tracking: { type: 'duration', target: 5, unit: 'min' },
      revisions: [
        {
          id: 'revision-1',
          effectiveDate: '2026-08-15',
          tracking: { type: 'duration', target: 20, unit: 'min' },
          schedule: { type: 'daily', anchorDate: '2026-01-01' },
          timeOfDay: 'afternoon',
        },
      ],
    });
    expect(configurationForDate(changing, '2026-08-14').tracking.target).toBe(5);
    expect(configurationForDate(changing, '2026-08-15').tracking.target).toBe(20);
  });
});

describe('completion and insight rules', () => {
  it('tracks quantitative partial progress separately from completion', () => {
    const measurable = habit({ tracking: { type: 'duration', target: 20, unit: 'min' } });
    const partial = getDayState(
      measurable,
      [log('2026-08-17', null, [{ id: 'entry-1', value: 12, unit: 'min' }])],
      '2026-08-17',
      { today: '2026-08-17' }
    );
    expect(partial.status).toBe('partial');
    expect(partial.value).toBe(12);
  });

  it('treats intentional skips as neutral rather than failures', () => {
    const logs = [
      log('2026-08-14', 'completed'),
      log('2026-08-15', 'skipped'),
      log('2026-08-16', 'completed'),
      log('2026-08-17', 'completed'),
    ];
    const stats = calculateHabitStats(habit(), logs, {
      endDate: '2026-08-17',
      today: '2026-08-17',
      days: 4,
    });
    expect(stats.expected).toBe(3);
    expect(stats.completed).toBe(3);
    expect(stats.skipped).toBe(1);
    expect(stats.currentStreak).toBe(3);
    expect(stats.completionRate).toBe(100);
    expect(explainStreak(stats)).toContain('Current streak: 3');
  });

  it('explains the scheduled date and reason that reset a streak', () => {
    const stats = calculateHabitStats(habit(), [log('2026-08-15'), log('2026-08-16', 'failed')], {
      endDate: '2026-08-17',
      today: '2026-08-17',
      days: 3,
    });
    expect(stats.currentStreak).toBe(0);
    expect(explainStreak(stats)).toContain('2026-08-16');
    expect(explainStreak(stats)).toContain('marked not completed');
  });

  it('does not count off-schedule activity in the expected denominator', () => {
    const weekdays = habit({
      schedule: { type: 'weekdays', weekdays: [1], anchorDate: '2026-01-01' },
    });
    const logs = [log('2026-08-17'), log('2026-08-18')];
    const offDay = getDayState(weekdays, logs, '2026-08-18', { today: '2026-08-18' });
    const stats = calculateHabitStats(weekdays, logs, {
      endDate: '2026-08-18',
      today: '2026-08-18',
      days: 2,
    });
    expect(offDay.status).toBe('completed-off-schedule');
    expect(stats.expected).toBe(1);
    expect(stats.completed).toBe(1);
  });

  it('preserves lifecycle history when a habit is paused and resumed', () => {
    const paused = habit({
      lifecycleHistory: [
        { id: 'pause', state: 'paused', effectiveDate: '2026-08-10' },
        { id: 'resume', state: 'active', effectiveDate: '2026-08-15' },
      ],
    });
    expect(getDayState(paused, [], '2026-08-12', { today: '2026-08-17' }).status).toBe('paused');
    expect(getDayState(paused, [], '2026-08-16', { today: '2026-08-17' }).status).toBe('missed');
  });
});
