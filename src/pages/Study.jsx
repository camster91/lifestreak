import { BookOpen, Clock, PenLine } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import useMemoriesStore from '../stores/memoriesStore.js';
import useGamificationStore from '../stores/gamificationStore.js';
import PageHeader from '../components/PageHeader';
import { haptics } from '../utils/native.js';

function Study() {
  const [topic, setTopic] = useState('');
  const [minutes, setMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState([]);

  const { saveReflection } = useMemoriesStore();
  const { recordReflection } = useGamificationStore();

  const handleAddEntry = () => {
    if (!topic.trim() || !minutes.trim()) return;
    haptics.success();
    const entry = {
      id: Date.now(),
      date: format(new Date(), 'yyyy-MM-dd'),
      topic: topic.trim(),
      minutes: parseInt(minutes, 10),
      notes: notes.trim(),
    };
    setEntries([entry, ...entries]);
    saveReflection(entry.date, `${entry.topic} (${entry.minutes} min)`);
    recordReflection();
    setTopic('');
    setMinutes('');
    setNotes('');
  };

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <PageHeader
        title="Study"
        subtitle="Track what you're studying"
        icon={BookOpen}
        gradient="from-blue-500 via-indigo-500 to-purple-600"
      />

      <main className="container mx-auto px-4 pt-4 space-y-4 max-w-2xl">
        {/* Add Study Entry */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-4 space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <PenLine className="w-5 h-5 text-primary" /> Log Study Session
            </h3>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What are you studying?"
              aria-label="Study topic"
              className="input input-bordered w-full"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="Minutes"
                aria-label="Study duration in minutes"
                className="input input-bordered w-32"
                min="1"
              />
              <button onClick={handleAddEntry} className="btn btn-primary flex-1">
                Add Entry
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              aria-label="Study notes (optional)"
              className="textarea textarea-bordered w-full"
              rows={2}
            />
          </div>
        </div>

        {/* Recent Entries */}
        {entries.length > 0 && (
          <div className="card bg-base-100 shadow-md">
            <div className="card-body p-4">
              <h3 className="font-semibold text-lg mb-3">Recent Sessions</h3>
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div key={entry.id} className="p-3 bg-base-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{entry.topic}</span>
                      <span className="text-sm text-base-content/60 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {entry.minutes}m
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-base-content/70 mt-1">{entry.notes}</p>
                    )}
                    <span className="text-xs text-base-content/50">{entry.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Study;
