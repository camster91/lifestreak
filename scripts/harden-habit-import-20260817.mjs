import fs from 'node:fs';

const storePath = 'src/habitTracker/store.js';
const uiPath = 'src/habitTracker/HabitTrackerApp.jsx';

let store = fs.readFileSync(storePath, 'utf8');

store = store
  .replace(
    "    name: String(input.name || '').trim(),",
    "    name: String(input.name || '').trim().slice(0, 100),",
  )
  .replace(
    "    description: String(input.description || '').trim(),",
    "    description: String(input.description || '').trim().slice(0, 500),",
  )
  .replace(
    "    category: String(input.category || 'Personal').trim() || 'Personal',",
    "    category: String(input.category || 'Personal').trim().slice(0, 50) || 'Personal',",
  )
  .replace(
    "    colour: String(input.colour || '#4f46e5'),",
    "    colour: /^#[0-9a-f]{6}$/i.test(String(input.colour || '')) ? String(input.colour) : '#4f46e5',",
  );

const importMarker = 'export const habitStore = {';
if (!store.includes('function sanitizeImportedState(')) {
  const helper = `
const MAX_IMPORTED_HABITS = 500;
const MAX_IMPORTED_LOGS = 50000;
const MAX_IMPORTED_ENTRIES = 100000;

function safeText(value, maximum, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : '';
  return (text || fallback).slice(0, maximum);
}

function safeColour(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : '#4f46e5';
}

function safeIdentifier(value, prefix) {
  const identifier = typeof value === 'string' ? value.slice(0, 200) : '';
  return identifier || createId(prefix);
}

function safeTimestamp(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function sanitizeImportedState(raw) {
  if (!raw || typeof raw !== 'object' || raw.version !== HABIT_SCHEMA_VERSION) {
    throw new Error('The selected file is not a supported LifeStreak habit export.');
  }
  if (!Array.isArray(raw.habits) || !Array.isArray(raw.logs)) {
    throw new Error('The selected file is incomplete.');
  }
  if (raw.habits.length > MAX_IMPORTED_HABITS || raw.logs.length > MAX_IMPORTED_LOGS) {
    throw new Error('The selected file exceeds the supported recovery limits.');
  }

  const seenHabitIds = new Set();
  const habits = raw.habits.map((source, index) => {
    if (!source || typeof source !== 'object') throw new Error(\`Habit \${index + 1} is invalid.\`);
    const id = safeIdentifier(source.id, 'habit');
    if (seenHabitIds.has(id)) throw new Error('The backup contains duplicate habit IDs.');
    seenHabitIds.add(id);
    const name = safeText(source.name, 100);
    if (!name) throw new Error(\`Habit \${index + 1} has no name.\`);
    const startDate = isValidLocalDate(source.startDate) ? source.startDate : toLocalDate();
    const schedule = normalizeSchedule(source.schedule, startDate);
    const tracking = normalizeTracking(source.tracking);
    const revisions = Array.isArray(source.revisions)
      ? source.revisions
          .filter((revision) => revision && isValidLocalDate(revision.effectiveDate))
          .slice(-1000)
          .map((revision) => ({
            id: safeIdentifier(revision.id, 'revision'),
            effectiveDate: revision.effectiveDate,
            schedule: normalizeSchedule(revision.schedule || schedule, startDate),
            tracking: normalizeTracking(revision.tracking || tracking),
            timeOfDay: ['morning', 'afternoon', 'evening', 'anytime'].includes(revision.timeOfDay)
              ? revision.timeOfDay
              : source.timeOfDay || 'anytime',
            createdAt: safeTimestamp(revision.createdAt),
          }))
      : [];
    const lifecycleHistory = Array.isArray(source.lifecycleHistory)
      ? source.lifecycleHistory
          .filter(
            (event) =>
              event &&
              isValidLocalDate(event.effectiveDate) &&
              ['active', 'paused', 'archived'].includes(event.state),
          )
          .slice(-1000)
          .map((event) => ({
            id: safeIdentifier(event.id, 'lifecycle'),
            state: event.state,
            effectiveDate: event.effectiveDate,
            createdAt: safeTimestamp(event.createdAt),
          }))
      : [];

    return {
      id,
      name,
      description: safeText(source.description, 500),
      category: safeText(source.category, 50, 'Personal'),
      colour: safeColour(source.colour),
      timeOfDay: ['morning', 'afternoon', 'evening', 'anytime'].includes(source.timeOfDay)
        ? source.timeOfDay
        : 'anytime',
      startDate,
      schedule,
      tracking,
      reminderTime: /^([01]\\d|2[0-3]):[0-5]\\d$/.test(String(source.reminderTime || ''))
        ? source.reminderTime
        : null,
      lifecycleState: 'active',
      lifecycleHistory,
      revisions,
      sourceTemplateId: safeText(source.sourceTemplateId, 100) || null,
      order: Number.isFinite(Number(source.order)) ? Number(source.order) : index,
      createdAt: safeTimestamp(source.createdAt),
      updatedAt: safeTimestamp(source.updatedAt),
    };
  });

  const seenLogIds = new Set();
  let entryCount = 0;
  const logs = raw.logs.map((source, index) => {
    if (!source || typeof source !== 'object') throw new Error(\`Log \${index + 1} is invalid.\`);
    const id = safeIdentifier(source.id, 'log');
    if (seenLogIds.has(id)) throw new Error('The backup contains duplicate log IDs.');
    seenLogIds.add(id);
    if (!seenHabitIds.has(source.habitId)) throw new Error('The backup contains a log for an unknown habit.');
    if (!isValidLocalDate(source.date)) throw new Error('The backup contains an invalid log date.');
    const entries = Array.isArray(source.entries)
      ? source.entries.map((entry) => {
          entryCount += 1;
          if (entryCount > MAX_IMPORTED_ENTRIES) {
            throw new Error('The selected file contains too many quantitative entries.');
          }
          const value = Number(entry?.value);
          if (!Number.isFinite(value) || value <= 0 || value > 1e12) {
            throw new Error('The backup contains an invalid quantitative value.');
          }
          return {
            id: safeIdentifier(entry?.id, 'entry'),
            value,
            unit: safeText(entry?.unit, 20, 'units'),
            createdAt: safeTimestamp(entry?.createdAt),
          };
        })
      : [];
    const explicitStatus = ['completed', 'failed', 'skipped'].includes(source.explicitStatus)
      ? source.explicitStatus
      : null;
    return {
      id,
      habitId: source.habitId,
      date: source.date,
      explicitStatus,
      entries,
      note: safeText(source.note, 2000),
      createdAt: safeTimestamp(source.createdAt),
      updatedAt: safeTimestamp(source.updatedAt),
    };
  });

  const preferences = {
    weekStartsOn: [0, 1, 6].includes(Number(raw.preferences?.weekStartsOn))
      ? Number(raw.preferences.weekStartsOn)
      : 1,
    completedPlacement: raw.preferences?.completedPlacement === 'keep' ? 'keep' : 'bottom',
    showHabitNamesInNotifications: Boolean(raw.preferences?.showHabitNamesInNotifications),
  };

  return {
    version: HABIT_SCHEMA_VERSION,
    habits,
    logs,
    preferences,
    onboarding: {
      completed: Boolean(raw.onboarding?.completed),
      dismissedAt: raw.onboarding?.dismissedAt ? safeTimestamp(raw.onboarding.dismissedAt) : null,
    },
    legacy: {
      detectedKeys: Array.isArray(raw.legacy?.detectedKeys)
        ? raw.legacy.detectedKeys.map((key) => safeText(key, 200)).filter(Boolean).slice(0, 500)
        : [],
      scannedAt: raw.legacy?.scannedAt ? safeTimestamp(raw.legacy.scannedAt) : null,
      quarantinedRecords: Array.isArray(raw.legacy?.quarantinedRecords)
        ? raw.legacy.quarantinedRecords.slice(0, 1000)
        : [],
    },
    operation: null,
    updatedAt: safeTimestamp(raw.updatedAt),
  };
}

`;
  store = store.replace(importMarker, `${helper}${importMarker}`);
}

store = store.replace(
  /  importData\(payload, mode = 'replace'\) \{[\s\S]*?\n  createRecoveryBackup\(reason = 'manual'\) \{/,
  `  importData(payload, mode = 'replace') {
    let candidate;
    try {
      candidate = sanitizeImportedState(payload?.data || payload);
    } catch (error) {
      setOperation('error', error instanceof Error ? error.message : 'The backup is invalid.');
      return false;
    }
    return transact((draft) => {
      if (mode === 'merge') {
        const habits = new Map(draft.habits.map((habit) => [habit.id, habit]));
        candidate.habits.forEach((habit) => habits.set(habit.id, habit));
        const logs = new Map(draft.logs.map((log) => [log.id, log]));
        candidate.logs.forEach((log) => logs.set(log.id, log));
        draft.habits = [...habits.values()];
        draft.logs = [...logs.values()];
        draft.preferences = { ...draft.preferences, ...candidate.preferences };
      } else {
        draft.version = candidate.version;
        draft.habits = candidate.habits;
        draft.logs = candidate.logs;
        draft.preferences = candidate.preferences;
        draft.onboarding = candidate.onboarding;
        draft.legacy = candidate.legacy;
      }
      draft.operation = null;
    }, mode === 'merge' ? 'The validated backup was merged.' : 'The validated backup was restored.');
  },

  createRecoveryBackup(reason = 'manual') {`,
);

fs.writeFileSync(storePath, store, 'utf8');

let ui = fs.readFileSync(uiPath, 'utf8');
ui = ui.replace(
  "style={{ '--habit-colour': habit.colour }}",
  "style={{ '--habit-colour': /^#[0-9a-f]{6}$/i.test(habit.colour || '') ? habit.colour : '#4f46e5' }}",
);
fs.writeFileSync(uiPath, ui, 'utf8');

console.log('Habit import boundary hardened.');
