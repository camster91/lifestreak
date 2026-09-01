import { beforeEach, describe, expect, it, vi } from 'vitest';

const notificationAdapter = vi.hoisted(() => ({
  native: true,
  replace: vi.fn(() => Promise.resolve({ scheduled: 0, permission: 'granted' })),
}));

vi.mock('../utils/notifications', () => ({
  isNativeNotificationPlatform: () => notificationAdapter.native,
  PRIVATE_REMINDER_BODY: 'A private LifeStreak reminder is ready.',
  PRIVATE_REMINDER_TITLE: 'LifeStreak reminder',
  replaceNativeHabitNotifications: notificationAdapter.replace,
}));

import {
  HABIT_REMINDER_LIMIT,
  planHabitNotifications,
  reconcileHabitNotifications,
} from './habitReminders';

function habit(overrides = {}) {
  return {
    id: 'habit-private',
    name: 'Sensitive habit name',
    startDate: '2026-08-01',
    schedule: { type: 'daily', anchorDate: '2026-08-01' },
    tracking: { type: 'binary', target: 1, unit: 'completion' },
    lifecycleState: 'active',
    lifecycleHistory: [],
    revisions: [],
    reminderTime: '09:00',
    ...overrides,
  };
}

function snapshot(overrides = {}) {
  return {
    habits: [habit()],
    logs: [],
    preferences: {
      weekStartsOn: 1,
      showHabitNamesInNotifications: false,
    },
    ...overrides,
  };
}

describe('independent habit reminder planning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationAdapter.native = true;
    notificationAdapter.replace.mockResolvedValue({ scheduled: 0, permission: 'granted' });
  });

  it('plans future schedule-aware reminders with private content by default', () => {
    const reminders = planHabitNotifications(
      snapshot({
        habits: [
          habit({
            schedule: { type: 'weekdays', weekdays: [1], anchorDate: '2026-08-01' },
          }),
        ],
      }),
      new Date(2026, 7, 30, 10, 0)
    );

    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders.every(({ body }) => body === 'A private LifeStreak reminder is ready.')).toBe(
      true
    );
    expect(reminders.every(({ schedule }) => schedule.at.getDay() === 1)).toBe(true);
    expect(reminders.every(({ schedule }) => schedule.at > new Date(2026, 7, 30, 10, 0))).toBe(
      true
    );
    expect(new Set(reminders.map(({ id }) => id)).size).toBe(reminders.length);
  });

  it('uses a habit name only after the explicit privacy preference is enabled', () => {
    const reminders = planHabitNotifications(
      snapshot({
        preferences: { weekStartsOn: 1, showHabitNamesInNotifications: true },
      }),
      new Date(2026, 7, 30, 8, 0)
    );

    expect(reminders[0].body).toBe('Sensitive habit name is ready when you are.');
  });

  it('omits inactive, past-time, and unscheduled dates and respects the native pending limit', () => {
    const reminders = planHabitNotifications(
      snapshot({
        habits: Array.from({ length: 10 }, (_, index) =>
          habit({ id: `habit-${index}`, name: `Habit ${index}` })
        ),
      }),
      new Date(2026, 7, 30, 9, 30)
    );

    expect(reminders).toHaveLength(HABIT_REMINDER_LIMIT);
    expect(reminders.every(({ schedule }) => schedule.at > new Date(2026, 7, 30, 9, 30))).toBe(
      true
    );
  });

  it('serializes native reconciliation and does nothing on the web', async () => {
    notificationAdapter.replace.mockImplementation(async (notifications) => ({
      scheduled: notifications.length,
      permission: 'granted',
    }));
    const state = snapshot();
    const result = await reconcileHabitNotifications(state, new Date(2026, 7, 30, 8, 0));
    expect(notificationAdapter.replace).toHaveBeenCalledOnce();
    expect(result.scheduled).toBeGreaterThan(0);

    notificationAdapter.native = false;
    expect(await reconcileHabitNotifications(state)).toEqual({
      scheduled: 0,
      permission: 'unsupported',
    });
    expect(notificationAdapter.replace).toHaveBeenCalledOnce();
  });
});
