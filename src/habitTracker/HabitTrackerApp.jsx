import { useEffect, useRef, useState } from 'react';
import {
  addDays,
  buildWeeklyReview,
  calculateHabitStats,
  configurationForDate,
  describeSchedule,
  eachDate,
  getDayState,
  lifecycleAt,
  logForDate,
  parseLocalDate,
  starterTemplates,
  statusLabel,
  TIME_GROUPS,
  toLocalDate,
} from './engine';
import { habitStore, useHabitState } from './store';
import './styles.css';

const GROUP_LABELS = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  anytime: 'Anytime',
};

const TRACKING_LABELS = {
  binary: 'Yes / no',
  count: 'Count',
  duration: 'Duration',
  distance: 'Distance',
  volume: 'Volume',
  weight: 'Weight',
  energy: 'Energy',
  custom: 'Custom number',
};

function formatDate(dateKey, options = { weekday: 'long', month: 'long', day: 'numeric' }) {
  return new Intl.DateTimeFormat(undefined, options).format(parseLocalDate(dateKey));
}

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function useOpenAppNotifications(snapshot) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return undefined;
    if (window.Notification.permission !== 'granted') return undefined;

    const check = () => {
      const now = new Date();
      const today = toLocalDate(now);
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      snapshot.habits.forEach((habit) => {
        if (!habit.reminderTime || habit.reminderTime !== currentTime) return;
        const state = getDayState(habit, snapshot.logs, today, {
          today,
          weekStartsOn: snapshot.preferences.weekStartsOn,
        });
        if (!['due', 'partial', 'missed'].includes(state.status)) return;
        const dedupeKey = `lifestreak-reminder:${habit.id}:${today}:${currentTime}`;
        if (window.sessionStorage.getItem(dedupeKey)) return;
        const body = snapshot.preferences.showHabitNamesInNotifications
          ? `${habit.name} is ready when you are.`
          : 'A LifeStreak habit is ready when you are.';
        new window.Notification('LifeStreak reminder', { body, tag: dedupeKey });
        window.sessionStorage.setItem(dedupeKey, 'shown');
      });
    };

    check();
    const timer = window.setInterval(check, 60_000);
    return () => window.clearInterval(timer);
  }, [snapshot]);
}

export default function HabitTrackerApp({ onOpenCollections }) {
  const snapshot = useHabitState();
  const [view, setView] = useState('today');
  const [selectedDate, setSelectedDate] = useState(toLocalDate());
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [historyHabitId, setHistoryHabitId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useOpenAppNotifications(snapshot);

  const openCreate = () => {
    setEditingHabitId(null);
    setShowForm(true);
  };

  const openEdit = (habitId) => {
    setEditingHabitId(habitId);
    setShowForm(true);
  };

  const editingHabit = snapshot.habits.find((habit) => habit.id === editingHabitId) || null;
  const historyHabit = snapshot.habits.find((habit) => habit.id === historyHabitId) || null;

  return (
    <div className="habit-app">
      <a className="habit-skip-link" href="#habit-main">
        Skip to main content
      </a>
      <header className="habit-header">
        <div>
          <p className="habit-eyebrow">LifeStreak</p>
          <h1>{view === 'today' ? formatDate(selectedDate) : viewLabel(view)}</h1>
        </div>
        <div className="habit-header-actions">
          <button
            className="habit-button habit-button-secondary"
            type="button"
            onClick={onOpenCollections}
          >
            Collections
          </button>
          <button className="habit-button habit-button-primary" type="button" onClick={openCreate}>
            Add habit
          </button>
        </div>
      </header>

      {snapshot.operation && (
        <OperationBanner operation={snapshot.operation} onDismiss={habitStore.dismissOperation} />
      )}

      <main id="habit-main" className="habit-main" tabIndex="-1">
        {view === 'today' && (
          <TodayView
            snapshot={snapshot}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onCreate={openCreate}
            onEdit={openEdit}
            onHistory={setHistoryHabitId}
          />
        )}
        {view === 'habits' && (
          <HabitsView
            snapshot={snapshot}
            onCreate={openCreate}
            onEdit={openEdit}
            onHistory={setHistoryHabitId}
          />
        )}
        {view === 'insights' && <InsightsView snapshot={snapshot} />}
        {view === 'settings' && <SettingsView snapshot={snapshot} />}
      </main>

      <nav className="habit-primary-nav" aria-label="Primary">
        {['today', 'habits', 'insights', 'settings'].map((item) => (
          <button
            key={item}
            type="button"
            className={view === item ? 'is-active' : ''}
            aria-current={view === item ? 'page' : undefined}
            onClick={() => setView(item)}
          >
            <span aria-hidden="true">{navSymbol(item)}</span>
            {viewLabel(item)}
          </button>
        ))}
      </nav>

      {showForm && (
        <HabitFormDialog
          habit={editingHabit}
          onClose={() => setShowForm(false)}
          onSaved={(habitId) => {
            setShowForm(false);
            if (habitId) setHistoryHabitId(habitId);
          }}
        />
      )}
      {historyHabit && (
        <HabitHistoryDialog
          habit={historyHabit}
          snapshot={snapshot}
          onClose={() => setHistoryHabitId(null)}
          onEdit={() => {
            setHistoryHabitId(null);
            openEdit(historyHabit.id);
          }}
        />
      )}
    </div>
  );
}

function viewLabel(view) {
  return { today: 'Today', habits: 'Habits', insights: 'Insights', settings: 'Settings' }[view];
}

function navSymbol(view) {
  return { today: '✓', habits: '≡', insights: '↗', settings: '⚙' }[view];
}

function OperationBanner({ operation, onDismiss }) {
  return (
    <div className={`habit-operation habit-operation-${operation.type}`} role="status">
      <span>{operation.message}</span>
      <div>
        {operation.type === 'success' && (
          <button type="button" onClick={() => habitStore.undo()}>
            Undo
          </button>
        )}
        <button type="button" onClick={onDismiss} aria-label="Dismiss message">
          Dismiss
        </button>
      </div>
    </div>
  );
}

function TodayView({ snapshot, selectedDate, setSelectedDate, onCreate, onEdit, onHistory }) {
  const today = toLocalDate();
  const ordered = [...snapshot.habits].sort((a, b) => a.order - b.order);
  const rows = ordered
    .map((habit) => ({
      habit,
      config: configurationForDate(habit, selectedDate),
      state: getDayState(habit, snapshot.logs, selectedDate, {
        today,
        weekStartsOn: snapshot.preferences.weekStartsOn,
      }),
    }))
    .filter(({ state }) =>
      ['due', 'completed', 'partial', 'failed', 'skipped', 'missed'].includes(state.status)
    );

  const expectedRows = rows.filter(({ state }) => state.scheduled && state.status !== 'skipped');
  const completed = expectedRows.filter(({ state }) => state.status === 'completed').length;
  const progress = expectedRows.length ? Math.round((completed / expectedRows.length) * 100) : 0;

  const grouped = TIME_GROUPS.map((group) => ({
    group,
    rows: rows
      .filter(({ config }) => config.timeOfDay === group)
      .sort((a, b) => {
        if (snapshot.preferences.completedPlacement !== 'bottom') return 0;
        return Number(a.state.status === 'completed') - Number(b.state.status === 'completed');
      }),
  })).filter(({ rows: groupRows }) => groupRows.length);

  return (
    <section aria-labelledby="today-heading">
      <div className="habit-date-toolbar">
        <button
          type="button"
          className="habit-icon-button"
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
        >
          <span aria-hidden="true">←</span>
          <span className="habit-visually-hidden">Previous day</span>
        </button>
        <div>
          <h2 id="today-heading">Your day</h2>
          <p>{selectedDate === today ? 'Today' : formatDate(selectedDate)}</p>
        </div>
        <button
          type="button"
          className="habit-icon-button"
          disabled={selectedDate >= today}
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
        >
          <span aria-hidden="true">→</span>
          <span className="habit-visually-hidden">Next day</span>
        </button>
        {selectedDate !== today && (
          <button
            type="button"
            className="habit-button habit-button-quiet"
            onClick={() => setSelectedDate(today)}
          >
            Return to today
          </button>
        )}
      </div>

      {snapshot.habits.length > 0 && (
        <div
          className="habit-progress-card"
          aria-label={`${completed} of ${expectedRows.length} expected habits completed`}
        >
          <div>
            <strong>{progress}%</strong>
            <span>
              {completed} of {expectedRows.length} completed
            </span>
          </div>
          <progress max="100" value={progress}>
            {progress}%
          </progress>
        </div>
      )}

      {!snapshot.habits.length && !snapshot.onboarding?.completed ? (
        <StarterPanel onCreate={onCreate} />
      ) : !snapshot.habits.length ? (
        <EmptyState
          title="No habits yet"
          description="Starter suggestions are hidden. Add your own routine or show the optional templates again."
          actionLabel="Show starter suggestions"
          onAction={() => habitStore.reopenOnboarding()}
        />
      ) : !rows.length ? (
        <EmptyState
          title="Nothing is due"
          description="There are no active habits scheduled for this date. Unscheduled days do not count as failures."
          actionLabel="Add another habit"
          onAction={onCreate}
        />
      ) : (
        <div className="habit-groups">
          {grouped.map(({ group, rows: groupRows }) => (
            <section key={group} className="habit-group" aria-labelledby={`group-${group}`}>
              <div className="habit-section-heading">
                <h3 id={`group-${group}`}>{GROUP_LABELS[group]}</h3>
                <span>{groupRows.length}</span>
              </div>
              <div className="habit-card-list">
                {groupRows.map(({ habit, state, config }) => (
                  <TodayHabitCard
                    key={habit.id}
                    habit={habit}
                    state={state}
                    config={config}
                    dateKey={selectedDate}
                    onEdit={() => onEdit(habit.id)}
                    onHistory={() => onHistory(habit.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function StarterPanel({ onCreate }) {
  const templates = starterTemplates();
  return (
    <section className="habit-starter-panel" aria-labelledby="starter-heading">
      <div className="habit-starter-intro">
        <p className="habit-eyebrow">A small, useful beginning</p>
        <h2 id="starter-heading">Choose only the habits that fit your life</h2>
        <p>
          Templates are optional and fully editable. Spiritual, health, planning, and learning
          habits use the same private habit engine.
        </p>
        <div className="habit-button-row">
          <button
            type="button"
            className="habit-button habit-button-primary"
            onClick={() => habitStore.addAllStarterTemplates()}
          >
            Add all starter habits
          </button>
          <button type="button" className="habit-button habit-button-secondary" onClick={onCreate}>
            Create my own
          </button>
          <button
            type="button"
            className="habit-button habit-button-quiet"
            onClick={() => habitStore.dismissOnboarding()}
          >
            Dismiss suggestions
          </button>
        </div>
      </div>
      <div className="habit-template-grid">
        {templates.map((template) => (
          <article key={template.templateId} className="habit-template-card">
            <span>{template.category}</span>
            <h3>{template.name}</h3>
            <p>{template.description}</p>
            <button
              type="button"
              className="habit-button habit-button-secondary"
              onClick={() => habitStore.addTemplate(template.templateId)}
            >
              Add template
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function TodayHabitCard({ habit, state, config, dateKey, onEdit, onHistory }) {
  const [value, setValue] = useState('');
  const [showActions, setShowActions] = useState(false);
  const completed = state.status === 'completed';

  const addValue = (event) => {
    event.preventDefault();
    if (habitStore.addValue(habit.id, dateKey, value, config.tracking.unit)) setValue('');
  };

  return (
    <article className={`habit-today-card status-${state.status}`}>
      <div
        className="habit-card-colour"
        style={{ '--habit-colour': habit.colour }}
        aria-hidden="true"
      />
      <div className="habit-card-content">
        <div className="habit-card-title-row">
          <div>
            <p className="habit-card-meta">
              {habit.category} · {describeSchedule(config.schedule)}
            </p>
            <h4>{habit.name}</h4>
          </div>
          <span className={`habit-status status-${state.status}`}>{statusLabel(state.status)}</span>
        </div>
        {habit.description && <p>{habit.description}</p>}

        {config.tracking.type !== 'binary' && (
          <div className="habit-value-summary">
            <strong>
              {state.value} {config.tracking.unit}
            </strong>
            <span>
              {config.tracking.anyAmountCounts
                ? 'Any amount counts'
                : `Target ${config.tracking.target} ${config.tracking.unit}`}
            </span>
          </div>
        )}

        <div className="habit-card-actions">
          {config.tracking.type === 'binary' ? (
            <button
              type="button"
              className={`habit-button ${completed ? 'habit-button-secondary' : 'habit-button-primary'}`}
              onClick={() =>
                completed
                  ? habitStore.clearDay(habit.id, dateKey)
                  : habitStore.setDayStatus(habit.id, dateKey, 'completed')
              }
            >
              {completed ? 'Clear completion' : 'Complete'}
            </button>
          ) : (
            <form className="habit-value-form" onSubmit={addValue}>
              <label>
                <span className="habit-visually-hidden">Add progress for {habit.name}</span>
                <input
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="any"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder={`Add ${config.tracking.unit}`}
                  aria-label={`Add ${config.tracking.unit} for ${habit.name}`}
                />
              </label>
              <button type="submit" className="habit-button habit-button-primary">
                Add
              </button>
            </form>
          )}
          <button
            type="button"
            className="habit-button habit-button-secondary"
            aria-expanded={showActions}
            onClick={() => setShowActions(!showActions)}
          >
            More
          </button>
        </div>

        {showActions && (
          <div className="habit-more-actions" aria-label={`Actions for ${habit.name}`}>
            {config.tracking.type !== 'binary' && (
              <button
                type="button"
                onClick={() => habitStore.setDayStatus(habit.id, dateKey, 'completed')}
              >
                Mark complete
              </button>
            )}
            <button
              type="button"
              onClick={() => habitStore.setDayStatus(habit.id, dateKey, 'skipped')}
            >
              Skip intentionally
            </button>
            <button
              type="button"
              onClick={() => habitStore.setDayStatus(habit.id, dateKey, 'failed')}
            >
              Mark not completed
            </button>
            <button type="button" onClick={() => habitStore.clearDay(habit.id, dateKey)}>
              Clear day
            </button>
            <button type="button" onClick={onHistory}>
              History and notes
            </button>
            <button type="button" onClick={onEdit}>
              Edit habit
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function HabitsView({ snapshot, onCreate, onEdit, onHistory }) {
  const [filter, setFilter] = useState('active');
  const today = toLocalDate();
  const rows = [...snapshot.habits]
    .filter((habit) => {
      const lifecycle = lifecycleAt(habit, today);
      return filter === 'all' || lifecycle === filter;
    })
    .sort((a, b) => a.order - b.order);

  return (
    <section aria-labelledby="habits-heading">
      <div className="habit-page-heading">
        <div>
          <h2 id="habits-heading">Manage habits</h2>
          <p>
            Schedules and targets change prospectively, so previous records keep their original
            meaning.
          </p>
        </div>
        <button type="button" className="habit-button habit-button-primary" onClick={onCreate}>
          Create habit
        </button>
      </div>
      <div className="habit-filter-tabs" role="group" aria-label="Filter habits">
        {['active', 'paused', 'archived', 'all'].map((item) => (
          <button
            key={item}
            type="button"
            className={filter === item ? 'is-active' : ''}
            aria-pressed={filter === item}
            onClick={() => setFilter(item)}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {!rows.length ? (
        <EmptyState
          title={`No ${filter === 'all' ? '' : filter} habits`}
          description="Create a habit or choose a different filter."
          actionLabel="Create habit"
          onAction={onCreate}
        />
      ) : (
        <div className="habit-management-grid">
          {rows.map((habit, index) => {
            const config = configurationForDate(habit, today);
            const lifecycle = lifecycleAt(habit, today);
            return (
              <article key={habit.id} className="habit-management-card">
                <div className="habit-card-title-row">
                  <div>
                    <p className="habit-card-meta">
                      {habit.category} · {GROUP_LABELS[config.timeOfDay]}
                    </p>
                    <h3>{habit.name}</h3>
                  </div>
                  <span className={`habit-status status-${lifecycle}`}>
                    {statusLabel(lifecycle)}
                  </span>
                </div>
                {habit.description && <p>{habit.description}</p>}
                <dl className="habit-definition-list">
                  <div>
                    <dt>Schedule</dt>
                    <dd>{describeSchedule(config.schedule)}</dd>
                  </div>
                  <div>
                    <dt>Tracking</dt>
                    <dd>{trackingDescription(config.tracking)}</dd>
                  </div>
                  <div>
                    <dt>Reminder</dt>
                    <dd>{habit.reminderTime || 'None'}</dd>
                  </div>
                </dl>
                <div className="habit-management-actions">
                  <button type="button" onClick={() => onEdit(habit.id)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => onHistory(habit.id)}>
                    History
                  </button>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => habitStore.moveHabit(habit.id, 'up')}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    disabled={index === rows.length - 1}
                    onClick={() => habitStore.moveHabit(habit.id, 'down')}
                  >
                    Move down
                  </button>
                  {lifecycle === 'active' && (
                    <button
                      type="button"
                      onClick={() => habitStore.setLifecycle(habit.id, 'paused')}
                    >
                      Pause
                    </button>
                  )}
                  {lifecycle === 'paused' && (
                    <button
                      type="button"
                      onClick={() => habitStore.setLifecycle(habit.id, 'active')}
                    >
                      Resume
                    </button>
                  )}
                  {lifecycle !== 'archived' && (
                    <button
                      type="button"
                      onClick={() => habitStore.setLifecycle(habit.id, 'archived')}
                    >
                      Archive
                    </button>
                  )}
                  {lifecycle === 'archived' && (
                    <button
                      type="button"
                      onClick={() => habitStore.setLifecycle(habit.id, 'active')}
                    >
                      Restore
                    </button>
                  )}
                  <DeleteHabitButton habit={habit} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      <section className="habit-template-library" aria-labelledby="templates-heading">
        <div className="habit-section-heading">
          <h3 id="templates-heading">Starter templates</h3>
        </div>
        <div className="habit-template-grid compact">
          {starterTemplates().map((template) => {
            const added = snapshot.habits.some(
              (habit) => habit.sourceTemplateId === template.templateId
            );
            return (
              <article key={template.templateId} className="habit-template-card">
                <span>{template.category}</span>
                <h4>{template.name}</h4>
                <p>{template.description}</p>
                <button
                  type="button"
                  className="habit-button habit-button-secondary"
                  disabled={added}
                  onClick={() => habitStore.addTemplate(template.templateId)}
                >
                  {added ? 'Added' : 'Add template'}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function DeleteHabitButton({ habit }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" className="habit-danger-text" onClick={() => setConfirming(true)}>
        Delete
      </button>
    );
  }
  return (
    <span className="habit-inline-confirm">
      Delete permanently?
      <button
        type="button"
        className="habit-danger-text"
        onClick={() => habitStore.deleteHabit(habit.id)}
      >
        Yes, delete
      </button>
      <button type="button" onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </span>
  );
}

function InsightsView({ snapshot }) {
  const today = toLocalDate();
  const active = snapshot.habits.filter((habit) => lifecycleAt(habit, today) === 'active');
  const [selectedId, setSelectedId] = useState(active[0]?.id || '');
  const resolvedSelectedId = snapshot.habits.some((habit) => habit.id === selectedId)
    ? selectedId
    : active[0]?.id || snapshot.habits[0]?.id || '';
  const selected = snapshot.habits.find((habit) => habit.id === resolvedSelectedId) || null;
  const stats = selected
    ? calculateHabitStats(selected, snapshot.logs, {
        days: 84,
        today,
        endDate: today,
        weekStartsOn: snapshot.preferences.weekStartsOn,
      })
    : null;
  const review = buildWeeklyReview(snapshot.habits, snapshot.logs, {
    endDate: today,
    today,
    weekStartsOn: snapshot.preferences.weekStartsOn,
  });

  if (!snapshot.habits.length) {
    return (
      <EmptyState
        title="No insights yet"
        description="Create a habit and log a few scheduled days before looking for trends."
      />
    );
  }

  return (
    <section aria-labelledby="insights-heading">
      <div className="habit-page-heading">
        <div>
          <h2 id="insights-heading">Schedule-aware insights</h2>
          <p>
            Only expected dates count in completion rates. Skipped, paused, future, and unscheduled
            dates stay neutral.
          </p>
        </div>
        <label className="habit-field compact-field">
          <span>Habit</span>
          <select
            value={resolvedSelectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {snapshot.habits.map((habit) => (
              <option key={habit.id} value={habit.id}>
                {habit.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selected && stats && (
        <>
          <div className="habit-metric-grid">
            <Metric
              label="Completion rate"
              value={stats.completionRate == null ? 'Not enough data' : `${stats.completionRate}%`}
            />
            <Metric
              label="Current streak"
              value={`${stats.currentStreak}`}
              detail="scheduled successes"
            />
            <Metric
              label="Best streak"
              value={`${stats.bestStreak}`}
              detail="scheduled successes"
            />
            <Metric
              label="Expected periods"
              value={`${stats.expected}`}
              detail={`${stats.completed} completed`}
            />
          </div>
          <section className="habit-calendar-panel" aria-labelledby="history-calendar-heading">
            <div className="habit-section-heading">
              <h3 id="history-calendar-heading">Recent history</h3>
              <span>{selected.name}</span>
            </div>
            <div
              className="habit-calendar"
              role="list"
              aria-label={`Recent history for ${selected.name}`}
            >
              {eachDate(addDays(today, -27), today).map((dateKey) => {
                const dayState = getDayState(selected, snapshot.logs, dateKey, {
                  today,
                  weekStartsOn: snapshot.preferences.weekStartsOn,
                });
                return (
                  <div
                    key={dateKey}
                    role="listitem"
                    className={`habit-calendar-day status-${dayState.status}`}
                    title={`${formatDate(dateKey, { month: 'short', day: 'numeric' })}: ${statusLabel(dayState.status)}`}
                  >
                    <span>{parseLocalDate(dateKey).getDate()}</span>
                    <small>{statusLabel(dayState.status)}</small>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      <section className="habit-review-panel" aria-labelledby="weekly-review-heading">
        <div className="habit-section-heading">
          <h3 id="weekly-review-heading">Weekly review</h3>
        </div>
        <div className="habit-review-grid">
          <ReviewColumn
            title="Going well"
            empty="No habit has enough strong evidence yet."
            rows={review.strong.map(
              ({ habit, stats: rowStats }) => `${habit.name} — ${rowStats.completionRate}%`
            )}
          />
          <ReviewColumn
            title="Consider adjusting"
            empty="No routine currently needs an obvious schedule or target adjustment."
            rows={review.adjust.map(
              ({ habit, stats: rowStats }) =>
                `${habit.name} — ${rowStats.completionRate}% over expected periods`
            )}
          />
          <ReviewColumn
            title="Not enough data"
            empty="Every habit has enough recent scheduled data."
            rows={review.insufficient.map(({ habit }) => habit.name)}
          />
        </div>
        <p className="habit-supporting-copy">
          A lower rate is information, not a judgement. Adjust the minimum, schedule, or lifecycle
          when a routine no longer fits.
        </p>
      </section>
    </section>
  );
}

function Metric({ label, value, detail }) {
  return (
    <article className="habit-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

function ReviewColumn({ title, rows, empty }) {
  return (
    <article>
      <h4>{title}</h4>
      {rows.length ? (
        <ul>
          {rows.map((row) => (
            <li key={row}>{row}</li>
          ))}
        </ul>
      ) : (
        <p>{empty}</p>
      )}
    </article>
  );
}

function SettingsView({ snapshot }) {
  const [notificationMessage, setNotificationMessage] = useState('');
  const [importMode, setImportMode] = useState('replace');
  const [resetText, setResetText] = useState('');

  const requestNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationMessage('Notifications are not supported in this browser.');
      return;
    }
    const permission = await window.Notification.requestPermission();
    setNotificationMessage(
      permission === 'granted'
        ? 'Permission granted. Reminders can appear while LifeStreak is open.'
        : `Permission is ${permission}. LifeStreak will not ask automatically.`
    );
  };

  const importFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      habitStore.createRecoveryBackup('before-import');
      habitStore.importData(parsed, importMode);
    } catch (error) {
      habitStore.dismissOperation();
      window.setTimeout(
        () =>
          window.alert(`Import failed: ${error instanceof Error ? error.message : 'Invalid file'}`),
        0
      );
    } finally {
      event.target.value = '';
    }
  };

  return (
    <section aria-labelledby="settings-heading">
      <div className="habit-page-heading">
        <div>
          <h2 id="settings-heading">Settings and recovery</h2>
          <p>Your habit database stays in this browser or installed app unless you export it.</p>
        </div>
      </div>

      <div className="habit-settings-grid">
        <section className="habit-settings-card" aria-labelledby="display-settings-heading">
          <h3 id="display-settings-heading">Routine preferences</h3>
          <label className="habit-field">
            <span>Week starts on</span>
            <select
              value={snapshot.preferences.weekStartsOn}
              onChange={(event) =>
                habitStore.setPreference('weekStartsOn', Number(event.target.value))
              }
            >
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
              <option value="6">Saturday</option>
            </select>
          </label>
          <label className="habit-field">
            <span>Completed habits</span>
            <select
              value={snapshot.preferences.completedPlacement}
              onChange={(event) =>
                habitStore.setPreference('completedPlacement', event.target.value)
              }
            >
              <option value="bottom">Move below outstanding habits</option>
              <option value="keep">Keep in their original order</option>
            </select>
          </label>
        </section>

        <section className="habit-settings-card" aria-labelledby="notification-settings-heading">
          <h3 id="notification-settings-heading">Reminder privacy</h3>
          <p>
            LifeStreak never requests notification permission during startup or background
            rescheduling.
          </p>
          <label className="habit-check-row">
            <input
              type="checkbox"
              checked={snapshot.preferences.showHabitNamesInNotifications}
              onChange={(event) =>
                habitStore.setPreference('showHabitNamesInNotifications', event.target.checked)
              }
            />
            <span>Show habit names on notification surfaces</span>
          </label>
          <button
            type="button"
            className="habit-button habit-button-secondary"
            onClick={requestNotifications}
          >
            Request notification permission
          </button>
          {notificationMessage && <p role="status">{notificationMessage}</p>}
          <small>
            Browser reminders operate while LifeStreak is open. Native background scheduling remains
            controlled by the installed app platform.
          </small>
        </section>

        <section className="habit-settings-card" aria-labelledby="backup-settings-heading">
          <h3 id="backup-settings-heading">Backup and portability</h3>
          <div className="habit-button-stack">
            <button
              type="button"
              className="habit-button habit-button-primary"
              onClick={() =>
                downloadJson(`lifestreak-habits-${toLocalDate()}.json`, habitStore.exportData())
              }
            >
              Export habit backup
            </button>
            <button
              type="button"
              className="habit-button habit-button-secondary"
              onClick={() => habitStore.createRecoveryBackup('manual')}
            >
              Create local recovery copy
            </button>
          </div>
          <fieldset className="habit-inline-fieldset">
            <legend>Import behaviour</legend>
            <label>
              <input
                type="radio"
                name="import-mode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={(event) => setImportMode(event.target.value)}
              />{' '}
              Replace after creating a recovery copy
            </label>
            <label>
              <input
                type="radio"
                name="import-mode"
                value="merge"
                checked={importMode === 'merge'}
                onChange={(event) => setImportMode(event.target.value)}
              />{' '}
              Merge by stable record ID
            </label>
          </fieldset>
          <label className="habit-file-label">
            Import LifeStreak JSON
            <input type="file" accept="application/json,.json" onChange={importFile} />
          </label>
        </section>

        <section className="habit-settings-card" aria-labelledby="legacy-settings-heading">
          <h3 id="legacy-settings-heading">Existing LifeStreak records</h3>
          <p>
            Specialist stores are preserved without silently converting dates, notes, service
            entries, or spiritual records into checkmarks.
          </p>
          <div className="habit-button-stack">
            <button
              type="button"
              className="habit-button habit-button-secondary"
              onClick={() => habitStore.scanLegacyData()}
            >
              Scan for preserved stores
            </button>
            <button
              type="button"
              className="habit-button habit-button-secondary"
              disabled={!snapshot.legacy.detectedKeys.length}
              onClick={() =>
                downloadJson(
                  `lifestreak-legacy-${toLocalDate()}.json`,
                  habitStore.exportLegacyData()
                )
              }
            >
              Export preserved stores
            </button>
          </div>
          {snapshot.legacy.detectedKeys.length > 0 && (
            <div>
              <p>
                {snapshot.legacy.detectedKeys.length} stores detected. Open Collections from the
                header to use the original specialist interface.
              </p>
              {snapshot.legacy.quarantinedRecords.length > 0 && (
                <div className="habit-form-error" role="status">
                  {snapshot.legacy.quarantinedRecords.length} stored value
                  {snapshot.legacy.quarantinedRecords.length === 1 ? '' : 's'} need review and were
                  not changed. Export preserved stores before attempting migration.
                </div>
              )}
              {snapshot.legacy.migrationRecords?.map((record) => (
                <div key={record.key} className="habit-inline-actions">
                  <span>
                    {record.key} → {record.successor} ({record.status})
                  </span>
                  {record.status === 'migration-candidate' && (
                    <button
                      type="button"
                      className="habit-button habit-button-secondary"
                      onClick={() => habitStore.migrateHistoricalStore(record.key)}
                    >
                      Preserve and migrate
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="habit-settings-card habit-danger-zone" aria-labelledby="danger-heading">
          <h3 id="danger-heading">Reset habit tracker</h3>
          <p>A recovery copy is created first. Existing specialist collections are not removed.</p>
          <label className="habit-field">
            <span>Type RESET to confirm</span>
            <input value={resetText} onChange={(event) => setResetText(event.target.value)} />
          </label>
          <button
            type="button"
            className="habit-button habit-button-danger"
            disabled={resetText !== 'RESET'}
            onClick={() => {
              if (habitStore.resetAllData()) setResetText('');
            }}
          >
            Create backup and reset habits
          </button>
        </section>
      </div>
    </section>
  );
}

function HabitFormDialog({ habit, onClose, onSaved }) {
  const today = toLocalDate();
  const current = habit ? configurationForDate(habit, today) : null;
  const [form, setForm] = useState(() => ({
    name: habit?.name || '',
    description: habit?.description || '',
    category: habit?.category || 'Personal',
    colour: habit?.colour || '#4f46e5',
    timeOfDay: current?.timeOfDay || 'anytime',
    startDate: habit?.startDate || today,
    scheduleType: current?.schedule.type || 'daily',
    weekdays: current?.schedule.weekdays || [1, 2, 3, 4, 5],
    timesPerWeek: current?.schedule.timesPerWeek || 3,
    intervalDays: current?.schedule.intervalDays || 2,
    monthlyDays: (current?.schedule.monthlyDays || [1]).join(', '),
    trackingType: current?.tracking.type || 'binary',
    target: current?.tracking.target || 1,
    stretchTarget: current?.tracking.stretchTarget || '',
    unit: current?.tracking.unit || 'rep',
    anyAmountCounts: current?.tracking.anyAmountCounts || false,
    reminderTime: habit?.reminderTime || '',
  }));
  const [error, setError] = useState('');

  const set = (key, value) => setForm((currentForm) => ({ ...currentForm, [key]: value }));
  const toggleWeekday = (day) =>
    set(
      'weekdays',
      form.weekdays.includes(day)
        ? form.weekdays.filter((item) => item !== day)
        : [...form.weekdays, day]
    );

  const submit = (event) => {
    event.preventDefault();
    setError('');
    const input = {
      name: form.name,
      description: form.description,
      category: form.category,
      colour: form.colour,
      timeOfDay: form.timeOfDay,
      startDate: form.startDate,
      reminderTime: form.reminderTime || null,
      schedule: {
        type: form.scheduleType,
        weekdays: form.weekdays,
        timesPerWeek: Number(form.timesPerWeek),
        intervalDays: Number(form.intervalDays),
        monthlyDays: String(form.monthlyDays)
          .split(',')
          .map((value) => Number(value.trim()))
          .filter(Boolean),
        anchorDate: form.startDate,
      },
      tracking: {
        type: form.trackingType,
        target: Number(form.target),
        stretchTarget: form.stretchTarget === '' ? null : Number(form.stretchTarget),
        unit: form.unit,
        anyAmountCounts: form.anyAmountCounts,
      },
    };
    try {
      const result = habit
        ? habitStore.updateHabit(habit.id, input, today)
        : habitStore.createHabit(input);
      if (result) onSaved(habit?.id || result);
      else setError('The habit was not saved. Review the message above and try again.');
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'The habit could not be saved.'
      );
    }
  };

  return (
    <Dialog title={habit ? `Edit ${habit.name}` : 'Create a habit'} onClose={onClose} wide>
      <form className="habit-form" onSubmit={submit}>
        {error && (
          <div className="habit-form-error" role="alert">
            {error}
          </div>
        )}
        <div className="habit-form-grid">
          <label className="habit-field full">
            <span>
              Name <strong aria-hidden="true">*</strong>
            </span>
            <input
              autoFocus
              required
              maxLength="100"
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
            />
          </label>
          <label className="habit-field full">
            <span>Description</span>
            <textarea
              rows="3"
              maxLength="500"
              value={form.description}
              onChange={(event) => set('description', event.target.value)}
            />
          </label>
          <label className="habit-field">
            <span>Category</span>
            <input
              maxLength="50"
              value={form.category}
              onChange={(event) => set('category', event.target.value)}
            />
          </label>
          <label className="habit-field">
            <span>Colour</span>
            <input
              type="color"
              value={form.colour}
              onChange={(event) => set('colour', event.target.value)}
            />
          </label>
          <label className="habit-field">
            <span>Time of day</span>
            <select
              value={form.timeOfDay}
              onChange={(event) => set('timeOfDay', event.target.value)}
            >
              {TIME_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {GROUP_LABELS[group]}
                </option>
              ))}
            </select>
          </label>
          <label className="habit-field">
            <span>Start date</span>
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => set('startDate', event.target.value)}
            />
          </label>
        </div>

        <fieldset className="habit-form-section">
          <legend>Schedule</legend>
          <label className="habit-field">
            <span>Frequency</span>
            <select
              value={form.scheduleType}
              onChange={(event) => set('scheduleType', event.target.value)}
            >
              <option value="daily">Every day</option>
              <option value="weekdays">Selected weekdays</option>
              <option value="timesPerWeek">Times per week</option>
              <option value="interval">Every N days</option>
              <option value="monthly">Selected days of month</option>
            </select>
          </label>
          {form.scheduleType === 'weekdays' && (
            <div className="habit-weekday-picker" role="group" aria-label="Scheduled weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name, day) => (
                <label key={name}>
                  <input
                    type="checkbox"
                    checked={form.weekdays.includes(day)}
                    onChange={() => toggleWeekday(day)}
                  />
                  <span>{name}</span>
                </label>
              ))}
            </div>
          )}
          {form.scheduleType === 'timesPerWeek' && (
            <label className="habit-field">
              <span>Times per week</span>
              <input
                type="number"
                min="1"
                max="7"
                value={form.timesPerWeek}
                onChange={(event) => set('timesPerWeek', event.target.value)}
              />
            </label>
          )}
          {form.scheduleType === 'interval' && (
            <label className="habit-field">
              <span>Repeat every</span>
              <span className="habit-input-suffix">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={form.intervalDays}
                  onChange={(event) => set('intervalDays', event.target.value)}
                />
                <span>days</span>
              </span>
            </label>
          )}
          {form.scheduleType === 'monthly' && (
            <label className="habit-field">
              <span>Days of month</span>
              <input
                value={form.monthlyDays}
                onChange={(event) => set('monthlyDays', event.target.value)}
                placeholder="1, 15, 28"
              />
              <small>Comma-separated values from 1 to 31.</small>
            </label>
          )}
        </fieldset>

        <fieldset className="habit-form-section">
          <legend>Tracking</legend>
          <label className="habit-field">
            <span>Tracking type</span>
            <select
              value={form.trackingType}
              onChange={(event) => set('trackingType', event.target.value)}
            >
              {Object.entries(TRACKING_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {form.trackingType !== 'binary' && (
            <div className="habit-form-grid">
              <label className="habit-field">
                <span>Minimum target</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.target}
                  onChange={(event) => set('target', event.target.value)}
                />
              </label>
              <label className="habit-field">
                <span>Unit</span>
                <input
                  maxLength="20"
                  value={form.unit}
                  onChange={(event) => set('unit', event.target.value)}
                />
              </label>
              <label className="habit-field">
                <span>Optional stretch target</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.stretchTarget}
                  onChange={(event) => set('stretchTarget', event.target.value)}
                />
              </label>
              <label className="habit-check-row">
                <input
                  type="checkbox"
                  checked={form.anyAmountCounts}
                  onChange={(event) => set('anyAmountCounts', event.target.checked)}
                />
                <span>Any amount counts as complete</span>
              </label>
            </div>
          )}
        </fieldset>

        <fieldset className="habit-form-section">
          <legend>Reminder</legend>
          <label className="habit-field">
            <span>Preferred time</span>
            <input
              type="time"
              value={form.reminderTime}
              onChange={(event) => set('reminderTime', event.target.value)}
            />
            <small>
              Permission is requested only from Settings. Browser reminders run while LifeStreak is
              open.
            </small>
          </label>
        </fieldset>

        {habit && (
          <p className="habit-supporting-copy">
            Schedule, target, unit, and time-of-day changes take effect today. Earlier logs continue
            to use the configuration active on their date.
          </p>
        )}
        <div className="habit-dialog-actions">
          <button type="button" className="habit-button habit-button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="habit-button habit-button-primary">
            {habit ? 'Save changes' : 'Create habit'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function HabitHistoryDialog({ habit, snapshot, onClose, onEdit }) {
  const today = toLocalDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [note, setNote] = useState(logForDate(snapshot.logs, habit.id, today)?.note || '');
  const config = configurationForDate(habit, selectedDate);
  const log = logForDate(snapshot.logs, habit.id, selectedDate);
  const dayState = getDayState(habit, snapshot.logs, selectedDate, {
    today,
    weekStartsOn: snapshot.preferences.weekStartsOn,
  });

  const selectDate = (dateKey) => {
    setSelectedDate(dateKey);
    setNote(logForDate(snapshot.logs, habit.id, dateKey)?.note || '');
  };

  return (
    <Dialog title={habit.name} onClose={onClose} wide>
      <div className="habit-history-header">
        <div>
          <span className={`habit-status status-${dayState.status}`}>
            {statusLabel(dayState.status)}
          </span>
          <p>
            {describeSchedule(config.schedule)} · {trackingDescription(config.tracking)}
          </p>
        </div>
        <button type="button" className="habit-button habit-button-secondary" onClick={onEdit}>
          Edit habit
        </button>
      </div>
      <label className="habit-field">
        <span>Review date</span>
        <input
          type="date"
          max={today}
          value={selectedDate}
          onChange={(event) => selectDate(event.target.value)}
        />
      </label>
      <section className="habit-history-day" aria-labelledby="selected-history-heading">
        <h3 id="selected-history-heading">{formatDate(selectedDate)}</h3>
        {log?.entries?.length ? (
          <ul className="habit-entry-list">
            {log.entries.map((entry) => (
              <li key={entry.id}>
                <span>
                  {entry.value} {entry.unit}
                </span>
                <button
                  type="button"
                  onClick={() => habitStore.removeValue(habit.id, selectedDate, entry.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No individual numeric entries for this date.</p>
        )}
        <label className="habit-field">
          <span>Private note</span>
          <textarea
            rows="4"
            maxLength="2000"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <div className="habit-button-row">
          <button
            type="button"
            className="habit-button habit-button-primary"
            onClick={() => habitStore.setNote(habit.id, selectedDate, note)}
          >
            Save note
          </button>
          <button
            type="button"
            className="habit-button habit-button-secondary"
            onClick={() => {
              habitStore.clearDay(habit.id, selectedDate);
              setNote('');
            }}
          >
            Clear this date
          </button>
        </div>
      </section>
      <section aria-labelledby="recent-log-heading">
        <h3 id="recent-log-heading">Recent records</h3>
        <div className="habit-history-list">
          {eachDate(addDays(today, -29), today)
            .reverse()
            .map((dateKey) => {
              const state = getDayState(habit, snapshot.logs, dateKey, {
                today,
                weekStartsOn: snapshot.preferences.weekStartsOn,
              });
              return (
                <button
                  type="button"
                  key={dateKey}
                  className={selectedDate === dateKey ? 'is-selected' : ''}
                  onClick={() => selectDate(dateKey)}
                >
                  <span>{formatDate(dateKey, { month: 'short', day: 'numeric' })}</span>
                  <span>{statusLabel(state.status)}</span>
                  {state.value > 0 && (
                    <span>
                      {state.value} {state.tracking.unit}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </section>
    </Dialog>
  );
}

function Dialog({ title, onClose, children, wide = false }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    const first = dialog?.querySelector('input, select, textarea, button');
    first?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="habit-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className={`habit-dialog ${wide ? 'habit-dialog-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="habit-dialog-title"
      >
        <header>
          <h2 id="habit-dialog-title">{title}</h2>
          <button
            type="button"
            className="habit-icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </header>
        <div className="habit-dialog-body">{children}</div>
      </section>
    </div>
  );
}

function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="habit-empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
      {actionLabel && onAction && (
        <button type="button" className="habit-button habit-button-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function trackingDescription(tracking) {
  if (tracking.type === 'binary') return 'Yes / no completion';
  if (tracking.anyAmountCounts) return `${TRACKING_LABELS[tracking.type]} · any amount counts`;
  return `${TRACKING_LABELS[tracking.type]} · ${tracking.target} ${tracking.unit}`;
}
