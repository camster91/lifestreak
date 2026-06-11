import { useState } from 'react';
import { Book, CheckCircle2, Plus, Minus } from 'lucide-react';
import { haptics } from '../utils/native';
import useProgressStore from '../stores/progressStore';
import useGamificationStore from '../stores/gamificationStore';

function BibleReadingCard() {
  const [notes, setNotes] = useState('');

  const {
    getBibleReadingProgress,
    updateBibleReadingProgress,
  } = useProgressStore();

  const { recordBibleReading } = useGamificationStore();

  const today = new Date().toISOString().split('T')[0];
  const progress = getBibleReadingProgress?.(today) || { chaptersRead: 0, notes: '' };

  const handleAddChapter = () => {
    haptics.light();
    const newCount = (progress.chaptersRead || 0) + 1;
    updateBibleReadingProgress?.(today, newCount, notes);
    if (newCount === 1) {
      setTimeout(() => {
        haptics.success();
        recordBibleReading();
      }, 100);
    }
  };

  const handleRemoveChapter = () => {
    haptics.light();
    const newCount = Math.max(0, (progress.chaptersRead || 0) - 1);
    updateBibleReadingProgress?.(today, newCount, notes);
  };

  const currentCount = progress.chaptersRead || 0;

  return (
    <article className="card bg-base-100 shadow-sm rounded-2xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${currentCount > 0 ? 'bg-success/10' : 'bg-secondary/10'}`}>
            <Book className={`w-6 h-6 ${currentCount > 0 ? 'text-success' : 'text-secondary'}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">Bible Reading</h3>
            <p className="text-sm text-base-content/50">{currentCount > 0 ? `${currentCount} chapter${currentCount === 1 ? '' : 's'} today` : 'Log your reading'}</p>
          </div>
          {currentCount > 0 && (
            <CheckCircle2 className="w-6 h-6 text-success" />
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            onClick={handleRemoveChapter}
            className="btn btn-ghost btn-sm btn-square"
            disabled={currentCount <= 0}
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-3xl font-bold w-12 text-center">{currentCount}</span>
          <button
            onClick={handleAddChapter}
            className="btn btn-primary btn-sm btn-square"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3">
          <input
            type="text"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              updateBibleReadingProgress?.(today, currentCount, e.target.value);
            }}
            placeholder="What did you read? (optional)"
            className="input input-bordered input-sm w-full"
          />
        </div>
      </div>
    </article>
  );
}

export default BibleReadingCard;