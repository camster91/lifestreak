import { act, fireEvent, render, screen } from '@testing-library/react';
import { format } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useProgressStore from '../stores/progressStore';
import BibleReadingCard from './BibleReadingCard';

vi.mock('../utils/native', () => ({ haptics: { light: vi.fn(), success: vi.fn() } }));

describe('Bible reading notes', () => {
  beforeEach(() => {
    useProgressStore.setState({ bibleReadings: {} });
  });

  it('persists edited notes with the existing chapter list', () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    useProgressStore.getState().updateBibleReadingProgress(today, 100, [1], 'Original');
    render(<BibleReadingCard />);
    const input = screen.getByRole('textbox', { name: 'Reading notes (optional)' });
    expect(input).toHaveValue('Original');
    fireEvent.change(input, { target: { value: 'Updated notes' } });
    expect(input).toHaveValue('Updated notes');
    expect(useProgressStore.getState().bibleReadings[today]).toMatchObject({
      chaptersRead: [1],
      notes: 'Updated notes',
    });
  });

  it('shows restored store notes without keeping a second local copy', () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    render(<BibleReadingCard />);
    act(() => {
      useProgressStore.getState().updateBibleReadingProgress(today, 100, [1], 'Restored notes');
    });
    expect(screen.getByRole('textbox', { name: 'Reading notes (optional)' })).toHaveValue(
      'Restored notes'
    );
  });
});
