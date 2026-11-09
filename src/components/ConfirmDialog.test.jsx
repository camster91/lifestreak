import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '../habitTracker/dialogGuards';
import ConfirmDialog from './ConfirmDialog';

describe('nested confirmation keyboard navigation', () => {
  it('keeps tab navigation in the confirmation above the history dialog', () => {
    render(
      <>
        <section className="habit-dialog" role="dialog" aria-label="History">
          <button type="button">Underlying action</button>
        </section>
        <ConfirmDialog open title="Remove entry?" onCancel={vi.fn()} onConfirm={vi.fn()} />
      </>
    );
    const close = screen.getByRole('button', { name: 'Close dialog' });
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    close.focus();
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();
    fireEvent.keyDown(confirm, { key: 'Tab' });
    expect(close).toHaveFocus();
  });

  it('Escape dismisses only the confirmation, not the underlying history dialog', () => {
    const closeHistory = vi.fn();
    const cancel = vi.fn();
    document.addEventListener('keydown', closeHistory);
    try {
      render(<ConfirmDialog open title="Remove entry?" onCancel={cancel} onConfirm={vi.fn()} />);
      fireEvent.keyDown(screen.getByRole('button', { name: 'Confirm' }), { key: 'Escape' });
      expect(cancel).toHaveBeenCalledOnce();
      expect(closeHistory).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener('keydown', closeHistory);
    }
  });
});
