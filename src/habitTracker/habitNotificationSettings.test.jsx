import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const notifications = vi.hoisted(() => ({
  check: vi.fn(),
  request: vi.fn(),
  show: vi.fn(),
}));
const reminders = vi.hoisted(() => ({ reconcile: vi.fn() }));

vi.mock('../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal()),
  checkNotificationPermission: notifications.check,
  requestNotificationPermission: notifications.request,
  showNotification: notifications.show,
}));
vi.mock('./habitReminders', async (importOriginal) => ({
  ...(await importOriginal()),
  reconcileHabitNotifications: reminders.reconcile,
}));

import App from '../App';
import { habitStore } from './store';

describe('habit reminder settings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    habitStore.resetAllData();
    habitStore.dismissOnboarding();
    habitStore.dismissOperation();
    notifications.check.mockReset();
    notifications.request.mockReset();
    notifications.show.mockReset();
    reminders.reconcile.mockReset();
    reminders.reconcile.mockResolvedValue({ scheduled: 0, permission: 'granted' });
  });

  it('requests permission only after explicit enable and sends a generic test', async () => {
    notifications.check.mockResolvedValue('prompt');
    notifications.request.mockResolvedValue('granted');
    notifications.show.mockResolvedValue(true);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    await waitFor(() => expect(notifications.check).toHaveBeenCalledTimes(1));
    expect(notifications.request).not.toHaveBeenCalled();
    const initialReconciliations = reminders.reconcile.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Enable reminders' }));
    await waitFor(() => expect(notifications.request).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(reminders.reconcile).toHaveBeenCalledTimes(initialReconciliations + 1)
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send private test reminder' }));

    await waitFor(() =>
      expect(notifications.show).toHaveBeenCalledWith('LifeStreak reminder', {
        body: 'A private LifeStreak reminder is ready.',
        tag: 'lifestreak-private-test',
      })
    );
    expect(await screen.findByText(/private test reminder was sent/i)).toBeVisible();
  });

  it('reports a granted permission whose native reconciliation fails', async () => {
    notifications.check.mockResolvedValue('prompt');
    notifications.request.mockResolvedValue('granted');
    reminders.reconcile.mockRejectedValue(new Error('native scheduler unavailable'));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Enable reminders' }));

    expect(await screen.findByText(/reminders could not be scheduled/i)).toBeVisible();
  });

  it('does not re-request denied permission and gives settings recovery guidance', async () => {
    notifications.check.mockResolvedValue('denied');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    const enable = await screen.findByRole('button', { name: 'Enable reminders' });
    await waitFor(() => expect(enable).toBeDisabled());
    expect(notifications.request).not.toHaveBeenCalled();
    expect(screen.getByText(/will not prompt again/i)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Send private test reminder' })).toBeDisabled();
  });
});
