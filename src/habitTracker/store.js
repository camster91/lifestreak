import { useSyncExternalStore } from 'react';
import {
  HABIT_SCHEMA_VERSION,
  configurationForDate,
  isValidLocalDate,
  lifecycleAt,
  normalizeSchedule,
  normalizeTracking,
  starterTemplates,
  toLocalDate,
} from './engine';

export const HABIT_STORAGE_KEY = 'lifestreak-habit-tracker-v1';
export const HABIT_BACKUP_PREFIX = 'lifestreak-habit-backup-';

const listeners = new Set();
let undoSnapshot = null;
let state = loadState();

function createId(prefix) {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function defaultState() {
  return {
    version: HABIT_SCHEMA_VERSION,
    habits: [],
    logs: [],
    preferences: {
      weekStartsOn: 1,
      completedPlacement: 'bottom',
      showHabitNamesInNotifications: false,
    },
    onboarding: {
      completed: false,
      dismissedAt: null,
    },
    legacy: {
      detectedKeys: [],
      scannedAt: null,
      quarantinedRecords: [],
    },
    operation: null,
    updatedAt: new Date().toISOString(),
  };
}

function storageAvailable() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function loadState() {
  const fallback = defaultState();
  if (!storageAvailable()) return fallback;
  try {
    const raw = window.localStorage.getItem(HABIT_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== HABIT_SCHEMA_VERSION) {
      return {
        ...fallback,
        operation: {
          type: 'warning',
          message: 'An unsupported habit database was preserved for recovery and was not loaded.',
          at: new Date().toISOString(),
        },
      };
    }
    return {
      ...fallback,
      ...parsed,
      habits: Array.isArray(parsed.habits) ? parsed.habits : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      preferences: { ...fallback.preferences, ...(parsed.preferences || {}) },
      onboarding: { ...fallback.onboarding, ...(parsed.onboarding || {}) },
      legacy: { ...fallback.legacy, ...(parsed.legacy || {}) },
      operation: null,
    };
  } catch (error) {
    return {
      ...fallback,
      operation: {
        type: 'error',
        message: `Habit data could not be read: ${error instanceof Error ? error.message : 'unknown error'}`,
        at: new Date().toISOString(),
      },
    };
  }
}

function serializable(value) {
  const next = clone(value);
  next.operation = null;
  return next;
}

function persist(nextState) {
  if (!storageAvailable()) return;
  window.localStorage.setItem(HABIT_STORAGE_KEY, JSON.stringify(serializable(nextState)));
}

function emit() {
  listeners.forEach((listener) => listener());
}

function setOperation(type, message) {
  state = {
    ...state,
    operation: { type, message, at: new Date().toISOString() },
  };
  emit();
}

function transact(mutator, successMessage, { undoable = true } = {}) {
  const previous = clone(state);
  try {
    const draft = clone(state);
    mutator(draft);
    draft.version = HABIT_SCHEMA_VERSION;
    draft.updatedAt = new Date().toISOString();
    draft.operation = successMessage
      ? { type: 'success', message: successMessage, at: new Date().toISOString() }
      : null;
    persist(draft);
    if (undoable) undoSnapshot = serializable(previous);
    state = draft;
    emit();
    return true;
  } catch (error) {
    state = {
      ...previous,
      operation: {
        type: 'error',
        message: `Nothing was saved. ${error instanceof Error ? error.message : 'Unknown storage error.'}`,
        at: new Date().toISOString(),
      },
    };
    emit();
    return false;
  }
}

function currentConfig(habit, dateKey = toLocalDate()) {
  return configurationForDate(habit, dateKey);
}

function normalizeHabitInput(input, id = createId('habit')) {
  const today = toLocalDate();
  const startDate = isValidLocalDate(input.startDate) ? input.startDate : today;
  return {
    id,
    name: String(input.name || '').trim(),
    description: String(input.description || '').trim(),
    category: String(input.category || 'Personal').trim() || 'Personal',
    colour: String(input.colour || '#4f46e5'),
    timeOfDay: input.timeOfDay || 'anytime',
    startDate,
    schedule: normalizeSchedule(input.schedule, startDate),
    tracking: normalizeTracking(input.tracking),
    reminderTime: input.reminderTime || null,
    lifecycleState: 'active',
    lifecycleHistory: [],
    revisions: [],
    sourceTemplateId: input.sourceTemplateId || null,
    order: Number.isFinite(input.order) ? input.order : 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function validateHabitInput(input) {
  if (!String(input.name || '').trim()) throw new Error('Habit name is required.');
  const tracking = normalizeTracking(input.tracking);
  if (tracking.type !== 'binary' && !tracking.anyAmountCounts && tracking.target <= 0) {
    throw new Error('A measurable habit needs a target greater than zero.');
  }
  const schedule = normalizeSchedule(input.schedule, input.startDate);
  if (schedule.type === 'weekdays' && schedule.weekdays.length === 0) {
    throw new Error('Choose at least one weekday.');
  }
  if (schedule.type === 'monthly' && schedule.monthlyDays.length === 0) {
    throw new Error('Choose at least one day of the month.');
  }
}

function upsertRevision(habit, changes, effectiveDate) {
  const previous = currentConfig(habit, effectiveDate);
  const nextSchedule = changes.schedule
    ? normalizeSchedule(changes.schedule, habit.startDate)
    : previous.schedule;
  const nextTracking = changes.tracking ? normalizeTracking(changes.tracking) : previous.tracking;
  const nextTimeOfDay = changes.timeOfDay || previous.timeOfDay;
  const changed =
    JSON.stringify(previous.schedule) !== JSON.stringify(nextSchedule) ||
    JSON.stringify(previous.tracking) !== JSON.stringify(nextTracking) ||
    previous.timeOfDay !== nextTimeOfDay;
  if (!changed) return;

  const revision = {
    id: createId('revision'),
    effectiveDate,
    schedule: nextSchedule,
    tracking: nextTracking,
    timeOfDay: nextTimeOfDay,
    createdAt: new Date().toISOString(),
  };
  habit.revisions = (habit.revisions || []).filter((item) => item.effectiveDate !== effectiveDate);
  habit.revisions.push(revision);
  habit.revisions.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
}

function findOrCreateLog(draft, habitId, dateKey) {
  let log = draft.logs.find((item) => item.habitId === habitId && item.date === dateKey);
  if (!log) {
    log = {
      id: createId('log'),
      habitId,
      date: dateKey,
      explicitStatus: null,
      entries: [],
      note: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    draft.logs.push(log);
  }
  return log;
}

function assertHabit(draft, habitId) {
  const habit = draft.habits.find((item) => item.id === habitId);
  if (!habit) throw new Error('Habit no longer exists.');
  return habit;
}

export const habitStore = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot() {
    return state;
  },

  dismissOperation() {
    state = { ...state, operation: null };
    emit();
  },

  undo() {
    if (!undoSnapshot) {
      setOperation('warning', 'There is nothing to undo.');
      return false;
    }
    try {
      const restored = {
        ...clone(undoSnapshot),
        operation: {
          type: 'success',
          message: 'The last change was undone.',
          at: new Date().toISOString(),
        },
      };
      persist(restored);
      undoSnapshot = null;
      state = restored;
      emit();
      return true;
    } catch (error) {
      setOperation(
        'error',
        `Undo failed: ${error instanceof Error ? error.message : 'unknown storage error'}`,
      );
      return false;
    }
  },

  createHabit(input) {
    validateHabitInput(input);
    const habit = normalizeHabitInput(input, createId('habit'));
    const success = transact((draft) => {
      habit.order = draft.habits.length;
      draft.habits.push(habit);
      draft.onboarding.completed = true;
    }, `“${habit.name}” was created.`);
    return success ? habit.id : null;
  },

  updateHabit(habitId, changes, effectiveDate = toLocalDate()) {
    validateHabitInput({
      ...changes,
      name: changes.name || state.habits.find((habit) => habit.id === habitId)?.name,
    });
    return transact((draft) => {
      const habit = assertHabit(draft, habitId);
      upsertRevision(habit, changes, effectiveDate);
      ['name', 'description', 'category', 'colour', 'reminderTime'].forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(changes, key)) habit[key] = changes[key];
      });
      habit.updatedAt = new Date().toISOString();
    }, 'Habit changes were saved.');
  },

  setLifecycle(habitId, lifecycleState, effectiveDate = toLocalDate()) {
    if (!['active', 'paused', 'archived'].includes(lifecycleState)) return false;
    return transact((draft) => {
      const habit = assertHabit(draft, habitId);
      habit.lifecycleHistory = (habit.lifecycleHistory || []).filter(
        (event) => event.effectiveDate !== effectiveDate,
      );
      habit.lifecycleHistory.push({
        id: createId('lifecycle'),
        state: lifecycleState,
        effectiveDate,
        createdAt: new Date().toISOString(),
      });
      habit.lifecycleHistory.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
      habit.updatedAt = new Date().toISOString();
    }, `Habit is now ${lifecycleState}.`);
  },

  deleteHabit(habitId) {
    const name = state.habits.find((habit) => habit.id === habitId)?.name || 'Habit';
    return transact((draft) => {
      assertHabit(draft, habitId);
      draft.habits = draft.habits.filter((habit) => habit.id !== habitId);
      draft.logs = draft.logs.filter((log) => log.habitId !== habitId);
    }, `“${name}” and its history were deleted. Use Undo to restore them.`);
  },

  moveHabit(habitId, direction) {
    return transact((draft) => {
      const ordered = [...draft.habits].sort((a, b) => a.order - b.order);
      const index = ordered.findIndex((habit) => habit.id === habitId);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= ordered.length) return;
      [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
      ordered.forEach((habit, order) => {
        const original = draft.habits.find((item) => item.id === habit.id);
        original.order = order;
      });
    }, 'Habit order was updated.');
  },

  setDayStatus(habitId, dateKey, explicitStatus) {
    if (!isValidLocalDate(dateKey)) return false;
    if (!['completed', 'failed', 'skipped'].includes(explicitStatus)) return false;
    return transact((draft) => {
      const habit = assertHabit(draft, habitId);
      const log = findOrCreateLog(draft, habitId, dateKey);
      log.explicitStatus = explicitStatus;
      if (explicitStatus === 'completed' && currentConfig(habit, dateKey).tracking.type === 'binary') {
        log.entries = [];
      }
      log.updatedAt = new Date().toISOString();
    }, `Habit marked ${explicitStatus}.`);
  },

  addValue(habitId, dateKey, value, unit) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setOperation('error', 'Enter a value greater than zero.');
      return false;
    }
    return transact((draft) => {
      const habit = assertHabit(draft, habitId);
      const tracking = currentConfig(habit, dateKey).tracking;
      if (tracking.type === 'binary') throw new Error('This habit does not accept a numeric value.');
      const log = findOrCreateLog(draft, habitId, dateKey);
      log.explicitStatus = null;
      log.entries.push({
        id: createId('entry'),
        value: numericValue,
        unit: unit || tracking.unit,
        createdAt: new Date().toISOString(),
      });
      log.updatedAt = new Date().toISOString();
    }, 'Progress was added.');
  },

  removeValue(habitId, dateKey, entryId) {
    return transact((draft) => {
      assertHabit(draft, habitId);
      const log = findOrCreateLog(draft, habitId, dateKey);
      log.entries = log.entries.filter((entry) => entry.id !== entryId);
      log.updatedAt = new Date().toISOString();
      if (!log.entries.length && !log.explicitStatus) {
        draft.logs = draft.logs.filter((item) => item.id !== log.id);
      }
    }, 'The progress entry was removed.');
  },

  clearDay(habitId, dateKey) {
    return transact((draft) => {
      assertHabit(draft, habitId);
      draft.logs = draft.logs.filter(
        (log) => !(log.habitId === habitId && log.date === dateKey),
      );
    }, 'The day was cleared.');
  },

  setNote(habitId, dateKey, note) {
    return transact((draft) => {
      assertHabit(draft, habitId);
      const log = findOrCreateLog(draft, habitId, dateKey);
      log.note = String(note || '').slice(0, 2000);
      log.updatedAt = new Date().toISOString();
    }, 'Note saved.');
  },

  addTemplate(templateId) {
    const template = starterTemplates().find((item) => item.templateId === templateId);
    if (!template) return null;
    if (state.habits.some((habit) => habit.sourceTemplateId === templateId)) {
      setOperation('warning', 'That starter habit has already been added.');
      return null;
    }
    return this.createHabit({ ...template, sourceTemplateId: template.templateId });
  },

  addAllStarterTemplates() {
    const missing = starterTemplates().filter(
      (template) => !state.habits.some((habit) => habit.sourceTemplateId === template.templateId),
    );
    if (!missing.length) {
      setOperation('warning', 'All starter habits are already present.');
      return false;
    }
    return transact((draft) => {
      missing.forEach((template) => {
        const habit = normalizeHabitInput(
          { ...template, sourceTemplateId: template.templateId },
          createId('habit'),
        );
        habit.order = draft.habits.length;
        draft.habits.push(habit);
      });
      draft.onboarding.completed = true;
    }, `${missing.length} starter habits were added.`);
  },

  dismissOnboarding() {
    return transact((draft) => {
      draft.onboarding.completed = true;
      draft.onboarding.dismissedAt = new Date().toISOString();
    }, 'Starter suggestions were dismissed.', { undoable: false });
  },

  setPreference(key, value) {
    return transact((draft) => {
      if (!Object.prototype.hasOwnProperty.call(draft.preferences, key)) {
        throw new Error('Unknown preference.');
      }
      draft.preferences[key] = value;
    }, 'Preference saved.', { undoable: false });
  },

  scanLegacyData() {
    if (!storageAvailable()) return [];
    const detectedKeys = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || key === HABIT_STORAGE_KEY || key.startsWith(HABIT_BACKUP_PREFIX)) continue;
      if (/life|streak|progress|service|reading|goal|memory|gamif|prayer|bible/i.test(key)) {
        detectedKeys.push(key);
      }
    }
    transact((draft) => {
      draft.legacy.detectedKeys = detectedKeys.sort();
      draft.legacy.scannedAt = new Date().toISOString();
    }, detectedKeys.length ? `${detectedKeys.length} legacy data stores were preserved.` : 'No legacy stores were detected.', { undoable: false });
    return detectedKeys;
  },

  exportLegacyData() {
    const records = {};
    if (!storageAvailable()) return records;
    const keys = state.legacy.detectedKeys || [];
    keys.forEach((key) => {
      try {
        records[key] = window.localStorage.getItem(key);
      } catch (error) {
        records[key] = { error: error instanceof Error ? error.message : 'Could not read record' };
      }
    });
    return {
      exportedAt: new Date().toISOString(),
      note: 'Original legacy values are preserved exactly and have not been reinterpreted.',
      records,
    };
  },

  exportData() {
    return {
      product: 'LifeStreak',
      schemaVersion: HABIT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data: serializable(state),
    };
  },

  importData(payload, mode = 'replace') {
    const candidate = payload?.data || payload;
    if (!candidate || candidate.version !== HABIT_SCHEMA_VERSION) {
      setOperation('error', 'The selected file is not a supported LifeStreak habit export.');
      return false;
    }
    if (!Array.isArray(candidate.habits) || !Array.isArray(candidate.logs)) {
      setOperation('error', 'The selected file is incomplete. No data was changed.');
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
      } else {
        Object.assign(draft, clone(candidate));
      }
      draft.version = HABIT_SCHEMA_VERSION;
      draft.operation = null;
    }, mode === 'merge' ? 'The backup was merged.' : 'The backup was restored.');
  },

  createRecoveryBackup(reason = 'manual') {
    if (!storageAvailable()) return null;
    const key = `${HABIT_BACKUP_PREFIX}${new Date().toISOString().replace(/[:.]/g, '-')}`;
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({ reason, createdAt: new Date().toISOString(), data: serializable(state) }),
      );
      setOperation('success', 'A local recovery copy was created.');
      return key;
    } catch (error) {
      setOperation(
        'error',
        `Recovery copy failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    }
  },

  resetAllData() {
    const backupKey = this.createRecoveryBackup('before-reset');
    if (!backupKey && storageAvailable()) return false;
    try {
      const next = defaultState();
      persist(next);
      undoSnapshot = serializable(state);
      state = {
        ...next,
        operation: {
          type: 'success',
          message: 'Habit data was reset. Use Undo during this session to restore it.',
          at: new Date().toISOString(),
        },
      };
      emit();
      return true;
    } catch (error) {
      setOperation('error', 'Reset failed. Existing data was left unchanged.');
      return false;
    }
  },

  currentLifecycle(habitId, dateKey = toLocalDate()) {
    const habit = state.habits.find((item) => item.id === habitId);
    return habit ? lifecycleAt(habit, dateKey) : null;
  },
};

export function useHabitState() {
  return useSyncExternalStore(habitStore.subscribe, habitStore.getSnapshot, habitStore.getSnapshot);
}
