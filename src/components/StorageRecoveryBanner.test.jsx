import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StorageRecoveryBanner from './StorageRecoveryBanner';
import { clearStorageRecoveryForTests, createSafeStorage } from '../utils/storageErrorHandler';

describe('StorageRecoveryBanner', () => {
  beforeEach(() => clearStorageRecoveryForTests());

  it('shows actionable recovery controls after a failed save and clears after retry', () => {
    localStorage.setItem.mockImplementationOnce(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    createSafeStorage('ls-reading-storage').setItem('ls-reading-storage', '{"state":{}}');

    render(<StorageRecoveryBanner />);
    expect(screen.getByRole('alert')).toHaveTextContent('could not safely save');
    expect(screen.getByRole('button', { name: 'Download recovery data' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('treats blocked reads as persistent reload recovery rather than empty downloadable data', () => {
    localStorage.getItem.mockImplementationOnce(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    createSafeStorage('ls-reading-storage').getItem('ls-reading-storage');

    render(<StorageRecoveryBanner />);
    expect(screen.getByRole('alert')).toHaveTextContent('cannot access local data');
    expect(screen.getByRole('button', { name: 'Retry after enabling storage' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Download recovery data' })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
    expect(vi.mocked(localStorage.setItem)).not.toHaveBeenCalled();
  });
});
