import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { BookOpen, CheckCircle2, PenLine, Save, ExternalLink } from 'lucide-react';
import useProgressStore from '../stores/progressStore.js';
import useMemoriesStore from '../stores/memoriesStore.js';
import useGamificationStore from '../stores/gamificationStore.js';
import { haptics, openBrowser } from '../utils/native.js';

function getDailyTextUrl(date = new Date()) {
  const yyyy = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `https://wol.jw.org/en/wol/dt/r1/lp-e/${yyyy}/${m}/${d}`;
}

function DailyTasksSection() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  const { getDailyTextProgress, updateDailyTextProgress } = useProgressStore();

  const dailyTextProgress = getDailyTextProgress(today);

  const { saveReflection, getReflection } = useMemoriesStore();
  const { recordDailyTextCompletion, recordReflection } = useGamificationStore();

  const existingReflection = getReflection(today);

  useEffect(() => {
    if (existingReflection && !noteText) {
      setNoteText(existingReflection);
      setNoteSaved(true);
    }
  }, [existingReflection, noteText]);

  const handleOpenDailyText = async () => {
    haptics.light();
    try {
      await openBrowser(getDailyTextUrl());
    } catch {
      window.open(getDailyTextUrl(), '_blank', 'noopener,noreferrer');
    }
  };

  const handleDailyTextCheck = () => {
    haptics.light();
    const newValue = !dailyTextProgress.readScripture;
    updateDailyTextProgress(today, 'readScripture', newValue);

    if (newValue) {
      setTimeout(() => {
        haptics.success();
        recordDailyTextCompletion();
      }, 100);
    }
  };

  const handleSaveNote = () => {
    if (noteText.trim()) {
      haptics.success();
      saveReflection(today, noteText.trim());
      setNoteSaved(true);
      if (!existingReflection) {
        recordReflection();
      }
    }
  };

  const dailyTextUrl = getDailyTextUrl();

  return (
    <div className="space-y-4">
      {/* Daily Text */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Daily Text</h3>
          </div>
          <p className="text-sm text-base-content/60 mb-3">{format(new Date(), 'EEEE, MMMM d')}</p>

          <button onClick={handleOpenDailyText} className="btn btn-primary w-full gap-2 mb-3">
            <ExternalLink className="w-4 h-4" />
            Open Daily Text
          </button>

          <button
            onClick={handleDailyTextCheck}
            className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
              dailyTextProgress.readScripture ? 'bg-success/10 text-success-content' : 'bg-base-200'
            }`}
          >
            <span className="font-medium">I've read today's text</span>
            {dailyTextProgress.readScripture ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-base-content/20" />
            )}
          </button>
        </div>
      </div>

      {/* Daily Reflection */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-3 w-full"
          >
            <PenLine className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-lg flex-1 text-left">Daily Reflection</h3>
            <span className="text-xs text-base-content/50">
              {showNotes ? 'Hide' : noteSaved ? 'Saved' : 'Optional'}
            </span>
          </button>
          {showNotes && (
            <div className="mt-3 space-y-2">
              <textarea
                value={noteText}
                onChange={(e) => {
                  setNoteText(e.target.value);
                  setNoteSaved(false);
                }}
                className="textarea textarea-bordered w-full"
                placeholder="What did you learn today?"
                rows={3}
              />
              <button
                onClick={handleSaveNote}
                className={`btn btn-sm w-full ${noteSaved ? 'btn-success' : 'btn-primary'}`}
              >
                <Save className="w-4 h-4" /> {noteSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DailyTasksSection;
