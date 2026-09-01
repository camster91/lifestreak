import { beforeEach, describe, expect, it, vi } from 'vitest';

const nativeNotifications = vi.hoisted(() => ({
  schedule: vi.fn(() => Promise.resolve()),
  cancel: vi.fn(() => Promise.resolve()),
  cancelAll: vi.fn(() => Promise.resolve()),
  getPending: vi.fn(() => Promise.resolve({ notifications: [] })),
  checkPermissions: vi.fn(() => Promise.resolve({ display: 'prompt' })),
  requestPermissions: vi.fn(() => Promise.resolve({ display: 'granted' })),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' },
}));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: nativeNotifications }));

import {
  checkNotificationPermission,
  initializeReminders,
  replaceNativeHabitNotifications,
  requestNotificationPermission,
  PRIVATE_REMINDER_BODY,
  PRIVATE_REMINDER_TITLE,
} from './notifications.js';

describe('native notification privacy contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nativeNotifications.checkPermissions.mockResolvedValue({ display: 'prompt' });
    nativeNotifications.requestPermissions.mockResolvedValue({ display: 'granted' });
    nativeNotifications.getPending.mockResolvedValue({ notifications: [] });
  });

  it('checks without prompting during background initialization', async () => {
    const handles = await initializeReminders({
      notificationsEnabled: true,
      notifications: { dailyText: { enabled: true, time: '07:00' } },
    });

    expect(handles).toEqual([]);
    expect(nativeNotifications.checkPermissions).toHaveBeenCalled();
    expect(nativeNotifications.requestPermissions).not.toHaveBeenCalled();
    expect(nativeNotifications.schedule).not.toHaveBeenCalled();
  });

  it('requests permission only through the explicit request function', async () => {
    expect(await checkNotificationPermission()).toBe('prompt');
    expect(nativeNotifications.requestPermissions).not.toHaveBeenCalled();

    expect(await requestNotificationPermission()).toBe('granted');
    expect(nativeNotifications.requestPermissions).toHaveBeenCalledTimes(1);
  });

  it('uses generic notification content after permission is granted', async () => {
    nativeNotifications.checkPermissions.mockResolvedValue({ display: 'granted' });
    await initializeReminders({
      notificationsEnabled: true,
      notifications: { bibleReading: { enabled: true, time: '20:00' } },
    });

    expect(nativeNotifications.schedule).toHaveBeenCalledWith({
      notifications: [
        expect.objectContaining({ title: PRIVATE_REMINDER_TITLE, body: PRIVATE_REMINDER_BODY }),
      ],
    });
  });

  it('replaces only owned habit reminders without prompting', async () => {
    nativeNotifications.checkPermissions.mockResolvedValue({ display: 'granted' });
    nativeNotifications.getPending.mockResolvedValue({
      notifications: [
        { id: 100001, extra: { lifestreakKind: 'habit-reminder' } },
        { id: 7, extra: { lifestreakKind: 'collection-reminder' } },
      ],
    });

    const result = await replaceNativeHabitNotifications([
      {
        id: 100002,
        title: PRIVATE_REMINDER_TITLE,
        body: PRIVATE_REMINDER_BODY,
        schedule: { at: new Date('2026-08-30T09:00:00') },
        extra: { habitId: 'habit-1', date: '2026-08-30' },
      },
    ]);

    expect(nativeNotifications.cancel).toHaveBeenCalledWith({ notifications: [{ id: 100001 }] });
    expect(nativeNotifications.cancel).not.toHaveBeenCalledWith({ notifications: [{ id: 7 }] });
    expect(nativeNotifications.requestPermissions).not.toHaveBeenCalled();
    expect(nativeNotifications.schedule).toHaveBeenCalledWith({
      notifications: [
        expect.objectContaining({
          id: 100002,
          extra: expect.objectContaining({ lifestreakKind: 'habit-reminder' }),
        }),
      ],
    });
    expect(result).toEqual({ scheduled: 1, permission: 'granted' });
  });
});
