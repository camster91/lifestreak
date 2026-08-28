import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
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
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
