import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';
import { habitStore } from '../habitTracker/store';

function BrokenView() {
  throw new Error('render failed');
}

describe('fatal error recovery', () => {
  beforeEach(() => {
    window.localStorage.clear();
    habitStore.resetAllData();
    habitStore.createHabit({
      name: 'Preserved routine',
      startDate: '2026-08-28',
      schedule: { type: 'daily', anchorDate: '2026-08-28' },
      tracking: { type: 'binary' },
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:recovery');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  it('offers reload and a portable recovery download before destructive reset', async () => {
    render(
      <ErrorBoundary>
        <BrokenView />
      </ErrorBoundary>
    );

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload Page' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download recovery backup' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Recovery backup downloaded.');
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(screen.getByText(/download a recovery backup before clearing data/i)).toBeVisible();
    await waitFor(() => expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled());
  });
});
