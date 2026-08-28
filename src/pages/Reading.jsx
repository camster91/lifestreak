import {
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  Library,
  Headphones,
  Monitor,
  FileText,
} from 'lucide-react';
import { useState } from 'react';
import useReadingStore from '../stores/readingStore.js';
import { readingItemPercent } from '../stores/readingStore.js';
import PageHeader from '../components/PageHeader';
import { haptics } from '../utils/native.js';

const TYPE_ICONS = {
  book: BookOpen,
  audio: Headphones,
  video: Monitor,
  article: FileText,
};

const TYPE_LABELS = {
  book: 'Book',
  audio: 'Audio',
  video: 'Video',
  article: 'Article',
};

function Reading() {
  const [title, setTitle] = useState('');
  const [itemType, setItemType] = useState('book');
  const [totalUnits, setTotalUnits] = useState('');
  const [unitLabel, setUnitLabel] = useState('chapters');

  const {
    addItem,
    updateProgress,
    finishItem,
    deleteItem,
    getInProgress,
    getCompleted,
    quarantinedItems,
  } = useReadingStore();

  const inProgress = getInProgress();
  const completed = getCompleted();

  const handleAdd = () => {
    if (!title.trim() || !totalUnits.trim()) return;
    const units = parseInt(totalUnits, 10);
    if (units <= 0) return;
    haptics.success();
    addItem({
      title: title.trim(),
      type: itemType,
      totalUnits: units,
      unitLabel,
      notes: '',
    });
    setTitle('');
    setTotalUnits('');
  };

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <PageHeader
        title="Reading"
        subtitle="Track books, audio, video, and articles"
        icon={Library}
        gradient="from-primary via-warning to-secondary"
      />

      <main className="container mx-auto px-4 pt-4 space-y-4 max-w-2xl">
        {quarantinedItems.length > 0 && (
          <div className="alert alert-warning" role="status">
            <span>
              {quarantinedItems.length} invalid or duplicate reading{' '}
              {quarantinedItems.length === 1 ? 'record is' : 'records are'} preserved for recovery
              and excluded from shelf progress.
            </span>
          </div>
        )}
        {/* Add Item */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-4 space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-warning" /> Add to Shelf
            </h3>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              aria-label="Reading title"
              className="input input-bordered min-h-11 w-full"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                aria-label="Reading item type"
                className="select select-bordered min-h-11 w-full sm:flex-1"
              >
                <option value="book">Book</option>
                <option value="audio">Audio</option>
                <option value="video">Video</option>
                <option value="article">Article</option>
              </select>
              <input
                type="number"
                value={totalUnits}
                onChange={(e) => setTotalUnits(e.target.value)}
                placeholder="Total"
                aria-label="Total reading units"
                className="input input-bordered min-h-11 w-full sm:w-28"
                min="1"
              />
              <select
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                aria-label="Reading unit"
                className="select select-bordered min-h-11 w-full sm:w-32"
              >
                <option value="chapters">Chapters</option>
                <option value="pages">Pages</option>
                <option value="minutes">Minutes</option>
                <option value="parts">Parts</option>
              </select>
            </div>
            <button onClick={handleAdd} className="btn btn-primary min-h-11 w-full">
              Add
            </button>
          </div>
        </div>

        {/* In Progress */}
        {inProgress.length > 0 && (
          <div className="card bg-base-100 shadow-md">
            <div className="card-body p-4">
              <h3 className="font-semibold text-lg mb-3">
                Currently Reading ({inProgress.length})
              </h3>
              <div className="space-y-3">
                {inProgress.map((item) => {
                  const Icon = TYPE_ICONS[item.type];
                  const percent = readingItemPercent(item) ?? 0;
                  return (
                    <div key={item.id} className="p-3 bg-base-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-base-content/80" />
                          <span className="font-medium">{item.title}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              haptics.light();
                              if (item.completedUnits + 1 >= item.totalUnits) {
                                finishItem(item.id);
                              } else {
                                updateProgress(item.id, item.completedUnits + 1);
                              }
                            }}
                            className="btn btn-ghost btn-square min-h-11 min-w-11"
                            aria-label={`Increase progress for ${item.title}`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              haptics.light();
                              deleteItem(item.id);
                            }}
                            className="btn btn-ghost btn-square min-h-11 min-w-11 text-error"
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-base-content/80">
                          {TYPE_LABELS[item.type]} · {item.completedUnits}/{item.totalUnits}{' '}
                          {item.unitLabel || 'units'}
                        </span>
                      </div>
                      <div
                        className="w-full bg-base-300 rounded-full h-2 mt-2"
                        role="progressbar"
                        aria-label={`${item.title} progress`}
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow={percent}
                        aria-valuetext={`${item.completedUnits} of ${item.totalUnits} ${item.unitLabel || 'units'}, ${percent}%`}
                      >
                        <div
                          className="bg-warning h-2 rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="text-xs text-base-content/80 mt-1">{percent}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div className="card bg-base-100 shadow-md">
            <div className="card-body p-4">
              <h3 className="font-semibold text-lg mb-3">Finished ({completed.length})</h3>
              <div className="space-y-2">
                {completed.map((item) => {
                  const Icon = TYPE_ICONS[item.type];
                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-base-200 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-success" />
                        <span className="font-medium">{item.title}</span>
                        <span className="text-xs text-base-content/80">
                          {TYPE_LABELS[item.type]} · {item.totalUnits} {item.unitLabel || 'units'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span className="text-xs text-base-content/80">{item.finishedDate}</span>
                        <button
                          onClick={() => {
                            haptics.light();
                            deleteItem(item.id);
                          }}
                          className="btn btn-ghost btn-square min-h-11 min-w-11 text-error"
                          aria-label={`Delete completed item ${item.title}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Reading;
