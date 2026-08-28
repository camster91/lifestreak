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
});
