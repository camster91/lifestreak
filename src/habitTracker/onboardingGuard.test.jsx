import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';
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
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });
});
