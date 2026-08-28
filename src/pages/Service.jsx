import { Briefcase, Clock, Plus, Trash2, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import useServiceStore from '../stores/serviceStore.js';
import PageHeader from '../components/PageHeader';
import { haptics } from '../utils/native.js';

const SERVICE_TYPES = [
  { value: 'field', label: 'Field' },
  { value: 'rv', label: 'RV Call' },
  { value: 'study', label: 'Bible Study' },
  { value: 'talk', label: 'Talk' },
  { value: 'other', label: 'Other' },
];

function Service() {
  const [hours, setHours] = useState('');
  const [type, setType] = useState('field');
  const [notes, setNotes] = useState('');

  const {
    entries,
    weeklyGoal,
    monthlyGoal,
    addEntry,
    deleteEntry,
    getWeeklyTotal,
    getMonthlyTotal,
    setWeeklyGoal,
    setMonthlyGoal,
  } = useServiceStore();

  const weeklyTotal = getWeeklyTotal();
  const monthlyTotal = getMonthlyTotal();

  const handleAdd = () => {
    if (!hours.trim()) return;
    const h = parseFloat(hours);
    if (h <= 0) return;
    haptics.success();
    addEntry({
      date: format(new Date(), 'yyyy-MM-dd'),
      hours: h,
      type,
      notes: notes.trim(),
    });
    setHours('');
    setNotes('');
  };

  const weeklyPercent = Math.min((weeklyTotal / weeklyGoal) * 100, 100);
  const monthlyPercent = Math.min((monthlyTotal / monthlyGoal) * 100, 100);

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <PageHeader
        title="Service"
        subtitle="Log hours and track your progress"
        icon={Briefcase}
        gradient="from-primary via-success to-secondary"
      />

      <main className="container mx-auto px-4 pt-4 space-y-4 max-w-2xl">
        {/* Progress Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card bg-base-100 shadow-md">
            <div className="card-body p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase text-base-content/60">This Week</span>
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <div className="text-2xl font-bold">{weeklyTotal.toFixed(1)}h</div>
              <div className="text-xs text-base-content/60">Goal: {weeklyGoal}h</div>
              <div className="w-full bg-base-200 rounded-full h-2 mt-2">
                <div
                  className="bg-success h-2 rounded-full transition-all"
                  style={{ width: `${weeklyPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-md">
            <div className="card-body p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase text-base-content/60">This Month</span>
                <TrendingUp className="w-4 h-4 text-secondary" />
              </div>
              <div className="text-2xl font-bold">{monthlyTotal.toFixed(1)}h</div>
              <div className="text-xs text-base-content/60">Goal: {monthlyGoal}h</div>
              <div className="w-full bg-base-200 rounded-full h-2 mt-2">
                <div
                  className="bg-secondary h-2 rounded-full transition-all"
                  style={{ width: `${monthlyPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Add Entry */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-4 space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-success" /> Log Session
            </h3>
            <div className="flex gap-2">
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Hours"
                aria-label="Service hours"
                className="input input-bordered w-28"
                step="0.25"
                min="0.25"
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                aria-label="Service type"
                className="select select-bordered flex-1"
              >
                {SERVICE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              aria-label="Service notes (optional)"
              className="input input-bordered w-full"
            />
            <button onClick={handleAdd} className="btn btn-primary w-full">
              Add Entry
            </button>
          </div>
        </div>

        {/* Goal Settings */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-4 space-y-3">
            <h3 className="font-semibold text-lg">Goals</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm w-20">Weekly:</span>
              <input
                type="number"
                value={weeklyGoal}
                onChange={(e) => setWeeklyGoal(parseFloat(e.target.value) || 0)}
                aria-label="Weekly service goal in hours"
                className="input input-bordered w-24"
                step="1"
                min="1"
              />
              <span className="text-sm text-base-content/60">hours</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm w-20">Monthly:</span>
              <input
                type="number"
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(parseFloat(e.target.value) || 0)}
                aria-label="Monthly service goal in hours"
                className="input input-bordered w-24"
                step="1"
                min="1"
              />
              <span className="text-sm text-base-content/60">hours</span>
            </div>
          </div>
        </div>

        {/* Recent Entries */}
        {entries.length > 0 && (
          <div className="card bg-base-100 shadow-md">
            <div className="card-body p-4">
              <h3 className="font-semibold text-lg mb-3">Recent Entries</h3>
              <div className="space-y-2">
                {entries.slice(0, 20).map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 bg-base-200 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.hours}h</span>
                        <span className="badge badge-sm">
                          {SERVICE_TYPES.find((t) => t.value === entry.type)?.label || entry.type}
                        </span>
                        <span className="text-xs text-base-content/50">{entry.date}</span>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-base-content/70 mt-1">{entry.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        haptics.light();
                        deleteEntry(entry.id);
                      }}
                      className="btn btn-ghost btn-sm btn-square text-error"
                      aria-label={`Delete service entry from ${entry.date}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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

export default Service;
