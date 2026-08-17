import {
  EXPLICIT_LOG_STATUSES,
  HABIT_SCHEMA_VERSION,
  LIFECYCLE_STATES,
  TIME_GROUPS,
  TRACKING_TYPES,
  isValidLocalDate,
  normalizeSchedule,
  normalizeTracking,
  toLocalDate,
} from './engine';
import { habitStore } from './store';

const MAX_IMPORTED_HABITS = 500;
const MAX_IMPORTED_LOGS = 50_000;
const MAX_IMPORTED_ENTRIES = 100_000;
const MAX_HISTORY_ITEMS = 1_000;
const MAX_IMPORT_CHARACTERS = 20_000_000;
const MAX_NUMBER = 1e12;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const COLOUR_PATTERN = /^#[0-9a-f]{6}$/i;
const SCHEDULE_TYPES = ['daily', 'weekdays', 'timesPerWeek', 'interval', 'monthly'];

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function safeText(value, maximum, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : '';
  return (text || fallback).slice(0, maximum);
}

function requireId(value, label) {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    throw new Error(`${label} has an invalid stable ID.`);
  }
  return value;
}

function safeTimestamp(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function safeColour(value) {
  return COLOUR_PATTERN.test(String(value || '')) ? String(value) : '#4f46e5';
}

function safeTimeOfDay(value) {
  return TIME_GROUPS.includes(value) ? value : 'anytime';
}

function safeReminderTime(value) {
  return TIME_PATTERN.test(String(value || '')) ? String(value) : null;
}

function sanitizeSchedule(value, startDate, label) {
  const source = requireObject(value || { type: 'daily' }, `${label} schedule`);
  if (!SCHEDULE_TYPES.includes(source.type)) {
    throw new Error(`${label} has an unsupported schedule type.`);
  }
  const normalized = normalizeSchedule(source, startDate);
  if (normalized.type === 'weekdays' && !normalized.weekdays.length) {
    throw new Error(`${label} must include at least one weekday.`);
  }
  if (normalized.type === 'monthly' && !normalized.monthlyDays.length) {
    throw new Error(`${label} must include at least one day of the month.`);
  }
  if (!isValidLocalDate(normalized.anchorDate)) {
    throw new Error(`${label} has an invalid schedule anchor date.`);
  }
  return normalized;
}

function sanitizeTracking(value, label) {
  const source = requireObject(value || { type: 'binary' }, `${label} tracking`);
  if (!TRACKING_TYPES.includes(source.type)) {
    throw new Error(`${label} has an unsupported tracking type.`);
  }
  const normalized = normalizeTracking(source);
  if (normalized.type !== 'binary') {
    const target = Number(source.target);
    if (!Number.isFinite(target) || target < 0 || target > MAX_NUMBER) {
      throw new Error(`${label} has an invalid tracking target.`);
    }
    if (!normalized.anyAmountCounts && target <= 0) {
      throw new Error(`${label} requires a target greater than zero.`);
    }
    if (source.stretchTarget != null && source.stretchTarget !== '') {
      const stretchTarget = Number(source.stretchTarget);
      if (!Number.isFinite(stretchTarget) || stretchTarget < target || stretchTarget > MAX_NUMBER) {
        throw new Error(`${label} has an invalid stretch target.`);
      }
    }
  }
  return {
    ...normalized,
    unit: normalized.type === 'binary' ? 'completion' : safeText(source.unit, 20, normalized.unit),
  };
}

function sanitizeHabit(sourceValue, index, seenHabitIds) {
  const source = requireObject(sourceValue, `Habit ${index + 1}`);
  const id = requireId(source.id, `Habit ${index + 1}`);
  if (seenHabitIds.has(id)) throw new Error('The backup contains duplicate habit IDs.');
  seenHabitIds.add(id);

  const name = safeText(source.name, 100);
  if (!name) throw new Error(`Habit ${index + 1} has no name.`);
  if (!isValidLocalDate(source.startDate)) {
    throw new Error(`Habit “${name}” has an invalid start date.`);
  }

  const schedule = sanitizeSchedule(source.schedule, source.startDate, `Habit “${name}”`);
  const tracking = sanitizeTracking(source.tracking, `Habit “${name}”`);

  const revisionIds = new Set();
  const revisions = Array.isArray(source.revisions)
    ? source.revisions.slice(-MAX_HISTORY_ITEMS).map((revisionValue, revisionIndex) => {
        const revision = requireObject(
          revisionValue,
          `Revision ${revisionIndex + 1} for habit “${name}”`,
        );
        const revisionId = requireId(
          revision.id,
          `Revision ${revisionIndex + 1} for habit “${name}”`,
        );
        if (revisionIds.has(revisionId)) {
          throw new Error(`Habit “${name}” contains duplicate revision IDs.`);
        }
        revisionIds.add(revisionId);
        if (!isValidLocalDate(revision.effectiveDate)) {
          throw new Error(`Habit “${name}” contains an invalid revision date.`);
        }
        return {
          id: revisionId,
          effectiveDate: revision.effectiveDate,
          schedule: sanitizeSchedule(
            revision.schedule || schedule,
            source.startDate,
            `Revision for habit “${name}”`,
          ),
          tracking: sanitizeTracking(
            revision.tracking || tracking,
            `Revision for habit “${name}”`,
          ),
          timeOfDay: safeTimeOfDay(revision.timeOfDay || source.timeOfDay),
          createdAt: safeTimestamp(revision.createdAt),
        };
      })
    : [];

  const lifecycleIds = new Set();
  const lifecycleHistory = Array.isArray(source.lifecycleHistory)
    ? source.lifecycleHistory.slice(-MAX_HISTORY_ITEMS).map((eventValue, eventIndex) => {
        const event = requireObject(
          eventValue,
          `Lifecycle event ${eventIndex + 1} for habit “${name}”`,
        );
        const eventId = requireId(
          event.id,
          `Lifecycle event ${eventIndex + 1} for habit “${name}”`,
        );
        if (lifecycleIds.has(eventId)) {
          throw new Error(`Habit “${name}” contains duplicate lifecycle event IDs.`);
        }
        lifecycleIds.add(eventId);
        if (!isValidLocalDate(event.effectiveDate) || !LIFECYCLE_STATES.includes(event.state)) {
          throw new Error(`Habit “${name}” contains an invalid lifecycle event.`);
        }
        return {
          id: eventId,
          state: event.state,
          effectiveDate: event.effectiveDate,
          createdAt: safeTimestamp(event.createdAt),
        };
      })
    : [];

  return {
    id,
    name,
    description: safeText(source.description, 500),
    category: safeText(source.category, 50, 'Personal'),
    colour: safeColour(source.colour),
    timeOfDay: safeTimeOfDay(source.timeOfDay),
    startDate: source.startDate,
    schedule,
    tracking,
    reminderTime: safeReminderTime(source.reminderTime),
    lifecycleState: LIFECYCLE_STATES.includes(source.lifecycleState)
      ? source.lifecycleState
      : 'active',
    lifecycleHistory,
    revisions,
    sourceTemplateId: safeText(source.sourceTemplateId, 100) || null,
    order: Number.isFinite(Number(source.order)) ? Number(source.order) : index,
    createdAt: safeTimestamp(source.createdAt),
    updatedAt: safeTimestamp(source.updatedAt),
  };
}

function sanitizeLog(sourceValue, index, habitIds, seenLogIds, seenHabitDates, entryCounter) {
  const source = requireObject(sourceValue, `Log ${index + 1}`);
  const id = requireId(source.id, `Log ${index + 1}`);
  if (seenLogIds.has(id)) throw new Error('The backup contains duplicate log IDs.');
  seenLogIds.add(id);

  const habitId = requireId(source.habitId, `Log ${index + 1}`);
  if (!habitIds.has(habitId)) throw new Error('The backup contains a log for an unknown habit.');
  if (!isValidLocalDate(source.date)) throw new Error('The backup contains an invalid log date.');

  const habitDateKey = `${habitId}:${source.date}`;
  if (seenHabitDates.has(habitDateKey)) {
    throw new Error('The backup contains more than one log for the same habit and date.');
  }
  seenHabitDates.add(habitDateKey);

  const entryIds = new Set();
  const entries = Array.isArray(source.entries)
    ? source.entries.map((entryValue, entryIndex) => {
        entryCounter.count += 1;
        if (entryCounter.count > MAX_IMPORTED_ENTRIES) {
          throw new Error('The selected file contains too many quantitative entries.');
        }
        const entry = requireObject(entryValue, `Entry ${entryIndex + 1} in log ${index + 1}`);
        const entryId = requireId(entry.id, `Entry ${entryIndex + 1} in log ${index + 1}`);
        if (entryIds.has(entryId)) throw new Error('The backup contains duplicate entry IDs.');
        entryIds.add(entryId);
        const value = Number(entry.value);
        if (!Number.isFinite(value) || value <= 0 || value > MAX_NUMBER) {
          throw new Error('The backup contains an invalid quantitative value.');
        }
        return {
          id: entryId,
          value,
          unit: safeText(entry.unit, 20, 'units'),
          createdAt: safeTimestamp(entry.createdAt),
        };
      })
    : [];

  return {
    id,
    habitId,
    date: source.date,
    explicitStatus: EXPLICIT_LOG_STATUSES.includes(source.explicitStatus)
      ? source.explicitStatus
      : null,
    entries,
    note: safeText(source.note, 2_000),
    createdAt: safeTimestamp(source.createdAt),
    updatedAt: safeTimestamp(source.updatedAt),
  };
}

export function sanitizeImportedState(payload) {
  const raw = payload?.data || payload;
  requireObject(raw, 'The selected backup');

  let serialized;
  try {
    serialized = JSON.stringify(raw);
  } catch {
    throw new Error('The selected backup cannot be safely read.');
  }
  if (serialized.length > MAX_IMPORT_CHARACTERS) {
    throw new Error('The selected file exceeds the supported recovery size.');
  }
  if (raw.version !== HABIT_SCHEMA_VERSION) {
    throw new Error('The selected file is not a supported LifeStreak habit export.');
  }
  if (!Array.isArray(raw.habits) || !Array.isArray(raw.logs)) {
    throw new Error('The selected file is incomplete.');
  }
  if (raw.habits.length > MAX_IMPORTED_HABITS || raw.logs.length > MAX_IMPORTED_LOGS) {
    throw new Error('The selected file exceeds the supported recovery limits.');
  }

  const seenHabitIds = new Set();
  const habits = raw.habits.map((habit, index) => sanitizeHabit(habit, index, seenHabitIds));
  const seenLogIds = new Set();
  const seenHabitDates = new Set();
  const entryCounter = { count: 0 };
  const logs = raw.logs.map((log, index) =>
    sanitizeLog(log, index, seenHabitIds, seenLogIds, seenHabitDates, entryCounter),
  );

  return {
    version: HABIT_SCHEMA_VERSION,
    habits,
    logs,
    preferences: {
      weekStartsOn: [0, 1, 6].includes(Number(raw.preferences?.weekStartsOn))
        ? Number(raw.preferences.weekStartsOn)
        : 1,
      completedPlacement: raw.preferences?.completedPlacement === 'keep' ? 'keep' : 'bottom',
      showHabitNamesInNotifications: Boolean(
        raw.preferences?.showHabitNamesInNotifications,
      ),
    },
    onboarding: {
      completed: Boolean(raw.onboarding?.completed),
      dismissedAt: raw.onboarding?.dismissedAt
        ? safeTimestamp(raw.onboarding.dismissedAt)
        : null,
    },
    legacy: {
      detectedKeys: Array.isArray(raw.legacy?.detectedKeys)
        ? raw.legacy.detectedKeys
            .map((key) => safeText(key, 200))
            .filter(Boolean)
            .slice(0, 500)
        : [],
      scannedAt: raw.legacy?.scannedAt ? safeTimestamp(raw.legacy.scannedAt) : null,
      quarantinedRecords: [],
    },
    operation: null,
    updatedAt: safeTimestamp(raw.updatedAt),
  };
}

function sanitizeHabitInput(input, { partial = false } = {}) {
  const source = requireObject(input || {}, 'Habit input');
  const result = { ...source };

  if (!partial || Object.prototype.hasOwnProperty.call(source, 'name')) {
    result.name = safeText(source.name, 100);
  }
  if (Object.prototype.hasOwnProperty.call(source, 'description')) {
    result.description = safeText(source.description, 500);
  }
  if (Object.prototype.hasOwnProperty.call(source, 'category')) {
    result.category = safeText(source.category, 50, 'Personal');
  }
  if (Object.prototype.hasOwnProperty.call(source, 'colour')) {
    result.colour = safeColour(source.colour);
  }
  if (Object.prototype.hasOwnProperty.call(source, 'timeOfDay')) {
    result.timeOfDay = safeTimeOfDay(source.timeOfDay);
  }
  if (Object.prototype.hasOwnProperty.call(source, 'startDate')) {
    if (!isValidLocalDate(source.startDate)) throw new Error('Choose a valid start date.');
    result.startDate = source.startDate;
  }
  if (Object.prototype.hasOwnProperty.call(source, 'reminderTime')) {
    result.reminderTime = source.reminderTime ? safeReminderTime(source.reminderTime) : null;
  }
  if (Object.prototype.hasOwnProperty.call(source, 'schedule')) {
    result.schedule = sanitizeSchedule(
      source.schedule,
      source.startDate || toLocalDate(),
      'Habit',
    );
  }
  if (Object.prototype.hasOwnProperty.call(source, 'tracking')) {
    result.tracking = sanitizeTracking(source.tracking, 'Habit');
  }
  if (Object.prototype.hasOwnProperty.call(source, 'sourceTemplateId')) {
    result.sourceTemplateId = safeText(source.sourceTemplateId, 100) || null;
  }
  return result;
}

const originalCreateHabit = habitStore.createHabit.bind(habitStore);
const originalUpdateHabit = habitStore.updateHabit.bind(habitStore);
const originalImportData = habitStore.importData.bind(habitStore);
const originalCreateRecoveryBackup = habitStore.createRecoveryBackup.bind(habitStore);
const originalAddValue = habitStore.addValue.bind(habitStore);
let lastSuccessfulBackupAt = 0;

habitStore.createRecoveryBackup = (...args) => {
  const key = originalCreateRecoveryBackup(...args);
  if (key) lastSuccessfulBackupAt = Date.now();
  return key;
};

habitStore.createHabit = (input) => originalCreateHabit(sanitizeHabitInput(input));
habitStore.updateHabit = (habitId, changes, effectiveDate) =>
  originalUpdateHabit(habitId, sanitizeHabitInput(changes, { partial: true }), effectiveDate);

habitStore.addValue = (habitId, dateKey, value, unit) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0 || numericValue > MAX_NUMBER) {
    return originalAddValue(habitId, dateKey, Number.NaN, safeText(unit, 20, 'units'));
  }
  return originalAddValue(habitId, dateKey, numericValue, safeText(unit, 20, 'units'));
};

habitStore.importData = (payload, mode = 'replace') => {
  const safeMode = mode === 'merge' ? 'merge' : 'replace';
  const candidate = sanitizeImportedState(payload);
  if (safeMode === 'replace' && Date.now() - lastSuccessfulBackupAt > 10_000) {
    const backupKey = habitStore.createRecoveryBackup('before-validated-import');
    if (!backupKey && typeof window !== 'undefined' && window.localStorage) {
      throw new Error('A recovery copy could not be created, so the import was cancelled.');
    }
  }
  return originalImportData({ data: candidate }, safeMode);
};
