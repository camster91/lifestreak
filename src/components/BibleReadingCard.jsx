import { useState, useEffect } from 'react';
import { Book, CheckCircle2, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { haptics } from '../utils/native';
import useProgressStore from '../stores/progressStore';
import useGamificationStore from '../stores/gamificationStore';

function BibleReadingCard() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const bibleReading = useProgressStore((s) => s.bibleReadings[today]);
  const updateBibleReadingProgress = useProgressStore((s) => s.updateBibleReadingProgress);
  const recordBibleReading = useGamificationStore((s) => s.recordBibleReading);

  const chapterCount = Array.isArray(bibleReading?.chaptersRead)
    ? bibleReading.chaptersRead.length
    : 0;
  const [notes, setNotes] = useState(bibleReading?.notes || '');

  useEffect(() => {
    setNotes(bibleReading?.notes || '');
  }, [bibleReading?.notes, today]);

  const persist = (count, nextNotes = notes) => {
    const chaptersRead = Array.from({ length: count }, (_, i) => i + 1);
    // Any chapters logged counts as a completed reading day for streaks.
    const progress = count > 0 ? 100 : 0;
    updateBibleReadingProgress(today, progress, chaptersRead, nextNotes);
  };

  const handleAddChapter = () => {
    haptics.light();
    const newCount = chapterCount + 1;
    persist(newCount);
    if (newCount === 1) {
      setTimeout(() => {
        haptics.success();
        recordBibleReading();
      }, 100);
    }
  };

  const handleRemoveChapter = () => {
    haptics.light();
    persist(Math.max(0, chapterCount - 1));
  };

  return (
    <article className="card bg-base-100 shadow-sm rounded-2xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-2xl ${chapterCount > 0 ? 'bg-success/10' : 'bg-secondary/10'}`}
          >
            <Book className={`w-6 h-6 ${chapterCount > 0 ? 'text-success' : 'text-secondary'}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">Bible Reading</h3>
            <p className="text-sm text-base-content/50">
              {chapterCount > 0
                ? `${chapterCount} chapter${chapterCount === 1 ? '' : 's'} today`
                : 'Log your reading'}
            </p>
          </div>
          {chapterCount > 0 && <CheckCircle2 className="w-6 h-6 text-success" />}
        </div>

        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleRemoveChapter}
            className="btn btn-ghost btn-md btn-square min-w-11 min-h-11"
            disabled={chapterCount <= 0}
            aria-label="Decrease chapters read"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-3xl font-bold w-12 text-center">{chapterCount}</span>
          <button
            type="button"
            onClick={handleAddChapter}
            className="btn btn-primary btn-md btn-square min-w-11 min-h-11"
            aria-label="Increase chapters read"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3">
          <input
            type="text"
            value={notes}
            onChange={(e) => {
              const value = e.target.value;
              setNotes(value);
              persist(chapterCount, value);
            }}
            placeholder="What did you read? (optional)"
            aria-label="Reading notes (optional)"
            className="input input-bordered input-sm w-full"
          />
        </div>
      </div>
    </article>
  );
}

export default BibleReadingCard;
