import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { toLocalDate } from './engine';
import { habitStore } from './store';

beforeEach(() => {
  window.localStorage.clear();
  habitStore.resetAllData();
  habitStore.dismissOnboarding();
});

describe('starter suggestion onboarding', () => {
  it('respects dismissal and allows the optional suggestions to be replayed', async () => {
    render(<App />);

    expect(
      screen.queryByRole('heading', { name: 'Choose only the habits that fit your life' })
    ).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'No habits yet' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show starter suggestions' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Choose only the habits that fit your life' })
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'No habits yet' })).not.toBeInTheDocument();
  });

  it('does not force restored users with existing habits through suggestions', async () => {
    habitStore.createHabit({
      name: 'Restored habit',
      startDate: '2026-08-28',
      schedule: { type: 'daily', anchorDate: '2026-08-28' },
      tracking: { type: 'binary' },
    });
    render(<App />);

    expect(
      screen.queryByRole('heading', { name: 'Choose only the habits that fit your life' })
    ).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Restored habit' })).toBeInTheDocument();
  });

  it('lets a user preview and customize a template before creating it', async () => {
    habitStore.reopenOnboarding();
    render(<App />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Customize first' }))[0]);

    expect(screen.getByRole('dialog', { name: 'Create a habit' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Morning Bible reading')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeVisible();
    expect(screen.getByText('Advanced options').closest('details')).toHaveAttribute('open');

    fireEvent.change(screen.getByLabelText(/^Name/), {
      target: { value: 'Customized morning reading' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create habit' }));
    await waitFor(() => {
      expect(habitStore.getSnapshot().habits).toEqual([
        expect.objectContaining({
          name: 'Customized morning reading',
          sourceTemplateId: 'bible-reading',
        }),
      ]);
    });
  });

  it('keeps a blank habit name-first while advanced controls remain optional', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Add habit' }));

    const advanced = screen.getByText('Advanced options').closest('details');
    expect(advanced).not.toHaveAttribute('open');
    expect(screen.getByLabelText(/^Name/)).toBeVisible();
    expect(screen.getByLabelText('Frequency')).not.toBeVisible();

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Simple routine' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create habit' }));

    await waitFor(() => {
      expect(habitStore.getSnapshot().habits).toEqual([
        expect.objectContaining({ name: 'Simple routine', category: 'Personal' }),
      ]);
    });

    expect(await screen.findByRole('heading', { name: 'Your habit is ready' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Complete first check-in' }));
    await waitFor(() => {
      expect(habitStore.getSnapshot().logs).toEqual([
        expect.objectContaining({ explicitStatus: 'completed' }),
      ]);
    });
    expect(
      screen.queryByRole('button', { name: 'Complete first check-in' })
    ).not.toBeInTheDocument();
  });

  it('offers a future effective date when editing tracked history', async () => {
    habitStore.createHabit({
      name: 'Measured routine',
      startDate: '2026-08-28',
      schedule: { type: 'daily', anchorDate: '2026-08-28' },
      tracking: { type: 'duration', target: 20, unit: 'min' },
    });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Habits' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Measured routine' });
    const effectiveDateLabel = screen.getByText('Changes take effect');
    const effectiveDate = effectiveDateLabel.closest('label').querySelector('input[type="date"]');
    expect(dialog).toContainElement(effectiveDate);
    expect(effectiveDate.getAttribute('min')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(effectiveDate.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(screen.getByText(/future date when today already has progress/i)).toBeVisible();
  });

  it('guides a quantitative habit through its first source value', async () => {
    const today = toLocalDate();
    habitStore.createHabit({
      name: 'First measured routine',
      startDate: today,
      schedule: { type: 'daily', anchorDate: today },
      tracking: { type: 'duration', target: 20, unit: 'min' },
    });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Habits' }));
    fireEvent.click(await screen.findByRole('button', { name: 'History' }));

    fireEvent.change(await screen.findByLabelText('First value in min'), {
      target: { value: '12.5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save first check-in' }));
    await waitFor(() => {
      expect(habitStore.getSnapshot().logs[0].entries).toEqual([
        expect.objectContaining({ value: 12.5, unit: 'min' }),
      ]);
    });
  });

  it('explains remaining flexible-schedule opportunities on Today', async () => {
    const today = toLocalDate();
    habitStore.createHabit({
      name: 'Three flexible sessions',
      startDate: today,
      schedule: { type: 'timesPerWeek', timesPerWeek: 3, anchorDate: today },
      tracking: { type: 'binary' },
    });
    render(<App />);

    expect(
      await screen.findByText(/0 of 3 this week · 3 remaining across \d+ available days?/i)
    ).toBeVisible();
  });

  it('collapses completed habits while keeping them available on demand', async () => {
    const today = toLocalDate();
    const habitId = habitStore.createHabit({
      name: 'Finished routine',
      startDate: today,
      schedule: { type: 'daily', anchorDate: today },
      tracking: { type: 'binary' },
    });
    habitStore.setDayStatus(habitId, today, 'completed');
    habitStore.setPreference('completedPlacement', 'hide');
    render(<App />);

    expect(await screen.findByRole('button', { name: 'Show 1 completed habit' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.queryByRole('heading', { name: 'Finished routine' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show 1 completed habit' }));
    expect(await screen.findByRole('heading', { name: 'Finished routine' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide completed habits' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('offers Retry for a recoverable failed habit save', async () => {
    const workingStorage = window.localStorage;
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Add habit' }));
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Retry routine' } });

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key) => workingStorage.getItem(key),
        setItem: () => {
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        },
        removeItem: (key) => workingStorage.removeItem(key),
        clear: () => workingStorage.clear(),
        key: (index) => workingStorage.key(index),
        get length() {
          return workingStorage.length;
        },
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create habit' }));
    expect(await screen.findByRole('button', { name: 'Retry save' })).toBeInTheDocument();
    expect(habitStore.getSnapshot().habits).toEqual([]);

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: workingStorage,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    expect(await screen.findByRole('dialog', { name: 'Retry routine' })).toBeInTheDocument();
    expect(habitStore.getSnapshot().habits).toEqual([
      expect.objectContaining({ name: 'Retry routine' }),
    ]);
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});
