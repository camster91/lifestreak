import { useSyncExternalStore } from 'react';
import {
  HABIT_SCHEMA_VERSION,
  TIME_GROUPS,
  configurationForDate,
  isValidLocalDate,
  lifecycleAt,
  normalizeSchedule,
  normalizeTracking,
  startOfWeek,
  starterTemplates,
  toLocalDate,
} from './engine';
import { migrateHabitDatabase } from './domain';

export const HABIT_STORAGE_KEY = 'lifestreak-habit-tracker-v1';
export const HABIT_BACKUP_PREFIX = 'lifestreak-habit-backup-';
export const LEGACY_BACKUP_PREFIX = 'lifestreak-legacy-backup-';

export const HISTORICAL_STORAGE_KEYS = {
  'jw-progress-storage': 'ls-progress-storage',
  'jw-progress-settings': 'ls-progress-settings',
  'jw-gamification-storage': 'ls-gamification-storage',
  'jw-goals-storage': 'ls-goals-storage',
  'jw-memories-storage': 'ls-memories-storage',
};

export const CURRENT_SPECIALIST_STORAGE_KEYS = [
  'ls-progress-storage',
  'ls-progress-settings',
  'ls-gamification-storage',
  'ls-goals-storage',
  'ls-memories-storage',
  'ls-service-storage',
  'ls-reading-storage',
];

const SPECIALIST_STORE_CONTRACTS = {
  'ls-progress-storage': {
    requiredFields: ['dailyTexts', 'prayers', 'bibleReadings', 'weeklyReadings'],
    supportedVersions: [0, 1, 2],
  },
  'ls-progress-settings': {
    requiredFields: ['notifications', 'bibleReadingSchedule', 'theme'],
    supportedVersions: [0, 1],
  },
  'ls-gamification-storage': {
    requiredFields: ['points', 'currentStreak'],
    supportedVersions: [0, 1],
  },
  'ls-goals-storage': {
    requiredFields: ['goals', 'projects'],
    supportedVersions: [1, 2],
  },
  'ls-memories-storage': {
    requiredFields: ['reflections'],
    supportedVersions: [0, 1],
  },
  'ls-service-storage': {
    requiredFields: ['entries', 'weeklyGoal', 'monthlyGoal'],
    supportedVersions: [0, 1],
  },
  'ls-reading-storage': {
    requiredFields: ['items'],
    supportedVersions: [0, 1],
  },
};

const AUXILIARY_STORAGE_KEYS = ['ls-error-logs', 'dailyReminderTime', 'installPromptDismissed'];
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;

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

function sanitizeWeeklyReviewDismissals(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([weekStart, habitIds]) => isValidLocalDate(weekStart) && Array.isArray(habitIds))
      .sort(([left], [right]) => right.localeCompare(left))
      .slice(0, 26)
      .map(([weekStart, habitIds]) => [
        weekStart,
        [...new Set(habitIds.filter((id) => typeof id === 'string' && ID_PATTERN.test(id)))].slice(
          0,
          500
        ),
      ])
  );
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
      timeGroupOrder: [...TIME_GROUPS],
      weeklyReviewDismissals: {},
    },
    onboarding: {
      completed: false,
      dismissedAt: null,
    },
    legacy: {
      detectedKeys: [],
      scannedAt: null,
      quarantinedRecords: [],
      migrationRecords: [],
    },
    operation: null,
    updatedAt: new Date().toISOString(),
  };
}

function localStorageAccess() {
  if (typeof window === 'undefined') return { storage: null, error: null };
  try {
    return { storage: window.localStorage || null, error: null };
  } catch (error) {
    return { storage: null, error };
  }
}

function storageAvailable() {
  return Boolean(localStorageAccess().storage);
}

function storageMessage(error) {
  return error instanceof Error ? error.message : 'Local storage is unavailable.';
}

export function classifyLegacyRecord(key, rawValue, availableKeys = [], successorRaw = null) {
  const successor = HISTORICAL_STORAGE_KEYS[key] || null;
  const isSpecialist = CURRENT_SPECIALIST_STORAGE_KEYS.includes(key) || Boolean(successor);

  if (typeof rawValue !== 'string' || !rawValue.length) {
    return { key, successor, status: 'quarantined', reason: 'The stored value is empty.' };
  }
  if (rawValue === '[object Object]') {
    return {
      key,
      successor,
      status: 'quarantined',
      reason: 'The value was damaged by an unsafe object-to-string storage write.',
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    if (key === 'installPromptDismissed' && !Number.isNaN(Date.parse(rawValue))) {
      return { key, successor, status: 'operational', reason: 'Valid install preference.' };
    }
    return { key, successor, status: 'quarantined', reason: 'The value is not valid JSON.' };
  }

  if (isSpecialist) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        key,
        successor,
        status: 'quarantined',
        reason: 'The specialist store is not a JSON object.',
      };
    }
    if (!parsed.state || typeof parsed.state !== 'object' || Array.isArray(parsed.state)) {
      return {
        key,
        successor,
        status: 'quarantined',
        reason: 'The Zustand state envelope is missing or malformed.',
      };
    }
    const canonicalKey = successor || key;
    const contract = SPECIALIST_STORE_CONTRACTS[canonicalKey];
    if (
      !Number.isInteger(parsed.version) ||
      !contract?.supportedVersions.includes(parsed.version)
    ) {
      return {
        key,
        successor,
        status: 'quarantined',
        reason: `The ${canonicalKey} payload uses an unsupported store version.`,
      };
    }
    if (!contract.requiredFields.every((field) => field in parsed.state)) {
      return {
        key,
        successor,
        status: 'quarantined',
        reason: `The ${canonicalKey} payload does not match its known state schema.`,
      };
    }
    if (successor && availableKeys.includes(successor)) {
      if (successorRaw === rawValue) {
        return {
          key,
          successor,
          status: 'migrated',
          reason: 'Historical and successor stores match exactly; no copy is needed.',
        };
      }
      return {
        key,
        successor,
        status: 'conflict',
        reason: `Historical and successor stores both exist; neither was changed.`,
      };
    }
    return successor
      ? {
          key,
          successor,
          status: 'migration-candidate',
          reason: 'A valid historical store can be offered for non-destructive migration.',
        }
      : {
          key,
          successor,
          status: 'preserved',
          reason: 'A valid specialist Collection store was preserved.',
        };
  }

  if (AUXILIARY_STORAGE_KEYS.includes(key)) {
    return { key, successor, status: 'operational', reason: 'Operational data is not migrated.' };
  }

  return {
    key,
    successor,
    status: 'quarantined',
    reason: 'The key resembles LifeStreak data but has no verified schema.',
  };
}

function loadState() {
  const fallback = defaultState();
  const { storage, error: accessError } = localStorageAccess();
  if (accessError) {
    return {
      ...fallback,
      operation: {
        type: 'error',
        message: `Habit storage is unavailable: ${storageMessage(accessError)}`,
        at: new Date().toISOString(),
      },
    };
  }
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(HABIT_STORAGE_KEY);
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
    const validated = migrateHabitDatabase(parsed);

    const preferences =
      validated.preferences && typeof validated.preferences === 'object'
        ? validated.preferences
        : {};
    const onboarding =
      validated.onboarding && typeof validated.onboarding === 'object' ? validated.onboarding : {};
    const legacy = validated.legacy && typeof validated.legacy === 'object' ? validated.legacy : {};

    return {
      version: HABIT_SCHEMA_VERSION,
      habits: validated.habits,
      logs: validated.logs,
      preferences: {
        weekStartsOn: [0, 1, 6].includes(Number(preferences.weekStartsOn))
          ? Number(preferences.weekStartsOn)
          : fallback.preferences.weekStartsOn,
        completedPlacement: preferences.completedPlacement === 'keep' ? 'keep' : 'bottom',
        showHabitNamesInNotifications: Boolean(preferences.showHabitNamesInNotifications),
        timeGroupOrder:
          Array.isArray(preferences.timeGroupOrder) &&
          preferences.timeGroupOrder.length === TIME_GROUPS.length &&
          TIME_GROUPS.every((group) => preferences.timeGroupOrder.includes(group))
            ? [...preferences.timeGroupOrder]
            : [...TIME_GROUPS],
        weeklyReviewDismissals: sanitizeWeeklyReviewDismissals(preferences.weeklyReviewDismissals),
      },
      onboarding: {
        completed: Boolean(onboarding.completed),
        dismissedAt: typeof onboarding.dismissedAt === 'string' ? onboarding.dismissedAt : null,
      },
      legacy: {
        detectedKeys: Array.isArray(legacy.detectedKeys)
          ? legacy.detectedKeys.filter((key) => typeof key === 'string').slice(0, 500)
          : [],
        scannedAt: typeof legacy.scannedAt === 'string' ? legacy.scannedAt : null,
        quarantinedRecords: [],
        migrationRecords: Array.isArray(legacy.migrationRecords)
          ? legacy.migrationRecords.slice(0, 100)
          : [],
      },
      operation: null,
      updatedAt:
        typeof validated.updatedAt === 'string' ? validated.updatedAt : new Date().toISOString(),
    };
  } catch (error) {
    return {
      ...fallback,
      operation: {
        type: 'error',
        message: `Habit data could not be read: ${storageMessage(error)}`,
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
  const { storage, error } = localStorageAccess();
  if (!storage) throw new Error(storageMessage(error));
  const serialized = JSON.stringify(serializable(nextState));
  storage.setItem(HABIT_STORAGE_KEY, serialized);
  if (storage.getItem(HABIT_STORAGE_KEY) !== serialized) {
    throw new Error('The habit database write could not be verified.');
  }
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
    const changed = mutator(draft);
    if (changed === false) {
      state = {
        ...previous,
        operation: {
          type: 'warning',
          message: 'Nothing changed.',
          at: new Date().toISOString(),
        },
      };
      emit();
      return false;
    }
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
        message: `Nothing was saved. ${storageMessage(error)}`,
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
    icon:
      String(input.icon || '✓')
        .trim()
        .slice(0, 8) || '✓',
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
  if (['weekdays', 'weekly'].includes(schedule.type) && schedule.weekdays.length === 0) {
    throw new Error('Choose at least one weekday.');
  }
  if (schedule.type === 'monthly' && schedule.monthlyDays.length === 0) {
    throw new Error('Choose at least one day of the month.');
  }
  if (schedule.endDate && isValidLocalDate(input.startDate) && schedule.endDate < input.startDate) {
    throw new Error('The end date cannot be before the start date.');
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
      setOperation('error', `Undo failed: ${storageMessage(error)}`);
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
      ['name', 'description', 'category', 'icon', 'colour', 'reminderTime'].forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(changes, key)) habit[key] = changes[key];
      });
      habit.updatedAt = new Date().toISOString();
    }, 'Habit changes were saved.');
  },

  setLifecycle(habitId, lifecycleState, effectiveDate = toLocalDate()) {
    if (!['active', 'paused', 'archived'].includes(lifecycleState)) return false;
    return transact((draft) => {
      const habit = assertHabit(draft, habitId);
      habit.lifecycleState = lifecycleState;
      habit.lifecycleHistory = (habit.lifecycleHistory || []).filter(
        (event) => event.effectiveDate !== effectiveDate
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

  duplicateHabit(habitId) {
    const source = state.habits.find((habit) => habit.id === habitId);
    if (!source) {
      setOperation('error', 'Habit no longer exists.');
      return null;
    }
    const config = currentConfig(source);
    return this.createHabit({
      name: `${source.name} copy`,
      description: source.description,
      category: source.category,
      icon: source.icon,
      colour: source.colour,
      timeOfDay: config.timeOfDay,
      startDate: toLocalDate(),
      schedule: { ...config.schedule, anchorDate: toLocalDate() },
      tracking: config.tracking,
      reminderTime: source.reminderTime,
      sourceTemplateId: null,
    });
  },

  moveHabit(habitId, direction) {
    return transact((draft) => {
      const ordered = [...draft.habits].sort((a, b) => a.order - b.order);
      const index = ordered.findIndex((habit) => habit.id === habitId);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= ordered.length) return false;
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
      if (
        explicitStatus === 'completed' &&
        currentConfig(habit, dateKey).tracking.type === 'binary'
      ) {
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
      if (tracking.type === 'binary')
        throw new Error('This habit does not accept a numeric value.');
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
      const log = draft.logs.find((item) => item.habitId === habitId && item.date === dateKey);
      if (!log || !log.entries.some((entry) => entry.id === entryId)) return false;
      log.entries = log.entries.filter((entry) => entry.id !== entryId);
      log.updatedAt = new Date().toISOString();
      if (!log.entries.length && !log.explicitStatus) {
        draft.logs = draft.logs.filter((item) => item.id !== log.id);
      }
    }, 'The progress entry was removed.');
  },

  updateValue(habitId, dateKey, entryId, value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setOperation('error', 'Enter a value greater than zero.');
      return false;
    }
    return transact((draft) => {
      const habit = assertHabit(draft, habitId);
      const tracking = currentConfig(habit, dateKey).tracking;
      if (tracking.type === 'binary')
        throw new Error('This habit does not accept a numeric value.');
      const log = draft.logs.find((item) => item.habitId === habitId && item.date === dateKey);
      const entry = log?.entries.find((item) => item.id === entryId);
      if (!entry) return false;
      if (entry.value === numericValue) return false;
      entry.value = numericValue;
      entry.updatedAt = new Date().toISOString();
      log.updatedAt = entry.updatedAt;
    }, 'The progress entry was corrected.');
  },

  clearDay(habitId, dateKey) {
    return transact((draft) => {
      assertHabit(draft, habitId);
      if (!draft.logs.some((log) => log.habitId === habitId && log.date === dateKey)) return false;
      draft.logs = draft.logs.filter((log) => !(log.habitId === habitId && log.date === dateKey));
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
      (template) => !state.habits.some((habit) => habit.sourceTemplateId === template.templateId)
    );
    if (!missing.length) {
      setOperation('warning', 'All starter habits are already present.');
      return false;
    }
    return transact((draft) => {
      missing.forEach((template) => {
        const habit = normalizeHabitInput(
          { ...template, sourceTemplateId: template.templateId },
          createId('habit')
        );
        habit.order = draft.habits.length;
        draft.habits.push(habit);
      });
      draft.onboarding.completed = true;
    }, `${missing.length} starter habits were added.`);
  },

  dismissOnboarding() {
    return transact(
      (draft) => {
        draft.onboarding.completed = true;
        draft.onboarding.dismissedAt = new Date().toISOString();
      },
      'Starter suggestions were dismissed.',
      { undoable: false }
    );
  },

  setPreference(key, value) {
    if (
      key === 'timeGroupOrder' &&
      (!Array.isArray(value) ||
        value.length !== TIME_GROUPS.length ||
        !TIME_GROUPS.every((group) => value.includes(group)))
    ) {
      setOperation('error', 'Time groups must include each supported group exactly once.');
      return false;
    }
    return transact(
      (draft) => {
        if (!Object.prototype.hasOwnProperty.call(draft.preferences, key)) {
          throw new Error('Unknown preference.');
        }
        draft.preferences[key] = value;
      },
      'Preference saved.',
      { undoable: false }
    );
  },

  dismissWeeklyReviewSuggestion(habitId, dateKey = toLocalDate()) {
    if (typeof habitId !== 'string' || !state.habits.some((habit) => habit.id === habitId)) {
      setOperation('error', 'The weekly review suggestion could not be found.');
      return false;
    }
    if (!isValidLocalDate(dateKey)) {
      setOperation('error', 'The weekly review date is invalid.');
      return false;
    }
    const weekStart = startOfWeek(dateKey, state.preferences.weekStartsOn);
    return transact(
      (draft) => {
        const dismissals = sanitizeWeeklyReviewDismissals(draft.preferences.weeklyReviewDismissals);
        const current = dismissals[weekStart] || [];
        if (current.includes(habitId)) return false;
        dismissals[weekStart] = [...current, habitId];
        draft.preferences.weeklyReviewDismissals = sanitizeWeeklyReviewDismissals(dismissals);
      },
      'Suggestion dismissed for this weekly review.',
      { undoable: false }
    );
  },

  scanLegacyData() {
    const { storage, error } = localStorageAccess();
    if (!storage) {
      setOperation('error', `Legacy data could not be scanned: ${storageMessage(error)}`);
      return [];
    }

    const detectedKeys = [];
    const records = [];
    try {
      const availableKeys = [];
      const availableValues = new Map();
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key) {
          availableKeys.push(key);
          availableValues.set(key, storage.getItem(key));
        }
      }
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (
          !key ||
          key === HABIT_STORAGE_KEY ||
          key.startsWith(HABIT_BACKUP_PREFIX) ||
          key.startsWith(LEGACY_BACKUP_PREFIX)
        )
          continue;
        if (
          CURRENT_SPECIALIST_STORAGE_KEYS.includes(key) ||
          Object.hasOwn(HISTORICAL_STORAGE_KEYS, key) ||
          AUXILIARY_STORAGE_KEYS.includes(key) ||
          /life|streak|progress|service|reading|goal|memory|gamif|prayer|bible/i.test(key)
        ) {
          detectedKeys.push(key);
          records.push(
            classifyLegacyRecord(
              key,
              storage.getItem(key),
              availableKeys,
              HISTORICAL_STORAGE_KEYS[key]
                ? availableValues.get(HISTORICAL_STORAGE_KEYS[key])
                : null
            )
          );
        }
      }
    } catch (scanError) {
      setOperation('error', `Legacy data could not be scanned: ${storageMessage(scanError)}`);
      return [];
    }

    const saved = transact(
      (draft) => {
        draft.legacy.detectedKeys = detectedKeys.sort();
        draft.legacy.scannedAt = new Date().toISOString();
        draft.legacy.quarantinedRecords = records
          .filter(({ status }) => status === 'quarantined' || status === 'conflict')
          .map(({ key, status, reason, successor }) => ({ key, status, reason, successor }));
        draft.legacy.migrationRecords = records
          .filter(({ status }) => status === 'migration-candidate' || status === 'migrated')
          .map(({ key, status, reason, successor }) => ({ key, status, reason, successor }));
      },
      detectedKeys.length
        ? `${detectedKeys.length} legacy data stores were preserved.`
        : 'No legacy stores were detected.',
      { undoable: false }
    );
    return saved ? records.sort((a, b) => a.key.localeCompare(b.key)) : [];
  },

  migrateHistoricalStore(sourceKey) {
    const successor = HISTORICAL_STORAGE_KEYS[sourceKey];
    if (!successor) {
      setOperation('error', 'The selected historical store has no verified successor.');
      return false;
    }
    const { storage, error } = localStorageAccess();
    if (!storage) {
      setOperation('error', `Migration could not start: ${storageMessage(error)}`);
      return false;
    }
    try {
      const sourceRaw = storage.getItem(sourceKey);
      const availableKeys = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key) availableKeys.push(key);
      }
      const classification = classifyLegacyRecord(
        sourceKey,
        sourceRaw,
        availableKeys,
        storage.getItem(successor)
      );
      if (classification.status === 'migrated') {
        setOperation('success', classification.reason);
        return true;
      }
      if (classification.status !== 'migration-candidate') {
        setOperation('warning', classification.reason);
        return false;
      }

      const backupKey = `${LEGACY_BACKUP_PREFIX}${sourceKey}-${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}`;
      const backup = JSON.stringify({
        migrationVersion: 1,
        sourceKey,
        successor,
        capturedAt: new Date().toISOString(),
        rawValue: sourceRaw,
      });
      storage.setItem(backupKey, backup);
      if (storage.getItem(backupKey) !== backup) {
        throw new Error('The pre-migration recovery copy could not be verified.');
      }
      storage.setItem(successor, sourceRaw);
      if (storage.getItem(successor) !== sourceRaw) {
        throw new Error('The migrated store could not be verified.');
      }

      return transact(
        (draft) => {
          draft.legacy.migrationRecords = draft.legacy.migrationRecords.map((record) =>
            record.key === sourceKey
              ? {
                  ...record,
                  status: 'migrated',
                  backupKey,
                  migratedAt: new Date().toISOString(),
                }
              : record
          );
        },
        `${sourceKey} was copied to ${successor}. The original and recovery copy remain intact.`,
        { undoable: false }
      );
    } catch (migrationError) {
      setOperation('error', `Migration was not completed: ${storageMessage(migrationError)}`);
      return false;
    }
  },

  cleanupHistoricalStore(sourceKey, confirmation) {
    const successor = HISTORICAL_STORAGE_KEYS[sourceKey];
    const expectedConfirmation = `REMOVE ${sourceKey}`;
    if (!successor || confirmation !== expectedConfirmation) {
      setOperation('warning', `Type ${expectedConfirmation} to remove the historical source.`);
      return false;
    }
    const { storage, error } = localStorageAccess();
    if (!storage) {
      setOperation('error', `Cleanup could not start: ${storageMessage(error)}`);
      return false;
    }

    let sourceRaw;
    try {
      sourceRaw = storage.getItem(sourceKey);
      const successorRaw = storage.getItem(successor);
      if (typeof sourceRaw !== 'string' || sourceRaw !== successorRaw) {
        setOperation(
          'warning',
          'Cleanup stopped because the historical source and successor no longer match exactly.'
        );
        return false;
      }

      let verifiedBackupKey = null;
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key?.startsWith(`${LEGACY_BACKUP_PREFIX}${sourceKey}-`)) continue;
        try {
          const backup = JSON.parse(storage.getItem(key));
          if (
            backup?.sourceKey === sourceKey &&
            backup?.successor === successor &&
            backup?.rawValue === sourceRaw
          ) {
            verifiedBackupKey = key;
            break;
          }
        } catch {
          // A malformed recovery value is not accepted as cleanup evidence.
        }
      }
      if (!verifiedBackupKey) {
        setOperation(
          'warning',
          'Cleanup stopped because no byte-exact recovery copy was verified.'
        );
        return false;
      }

      storage.removeItem(sourceKey);
      if (storage.getItem(sourceKey) !== null) {
        throw new Error('The historical source could not be removed and remains preserved.');
      }

      const recorded = transact(
        (draft) => {
          draft.legacy.detectedKeys = draft.legacy.detectedKeys.filter((key) => key !== sourceKey);
          draft.legacy.migrationRecords = draft.legacy.migrationRecords.map((record) =>
            record.key === sourceKey
              ? {
                  ...record,
                  status: 'cleaned',
                  cleanupAt: new Date().toISOString(),
                  backupKey: verifiedBackupKey,
                }
              : record
          );
        },
        'Historical source removed after exact successor and recovery verification.',
        { undoable: false }
      );
      if (!recorded) {
        storage.setItem(sourceKey, sourceRaw);
        if (storage.getItem(sourceKey) !== sourceRaw) {
          setOperation(
            'error',
            'Cleanup state could not be recorded and the historical source could not be restored. Use the retained recovery copy.'
          );
        }
        return false;
      }
      return true;
    } catch (cleanupError) {
      try {
        if (typeof sourceRaw === 'string' && storage.getItem(sourceKey) === null) {
          storage.setItem(sourceKey, sourceRaw);
        }
      } catch {
        // The retained recovery copy remains the fallback if source restoration is blocked.
      }
      setOperation('error', `Cleanup was not completed: ${storageMessage(cleanupError)}`);
      return false;
    }
  },

  exportLegacyData() {
    const records = {};
    const { storage } = localStorageAccess();
    if (!storage) return records;
    const keys = state.legacy.detectedKeys || [];
    keys.forEach((key) => {
      try {
        records[key] = storage.getItem(key);
      } catch (error) {
        records[key] = { error: storageMessage(error) };
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
    return transact(
      (draft) => {
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
      },
      mode === 'merge' ? 'The backup was merged.' : 'The backup was restored.'
    );
  },

  createRecoveryBackup(reason = 'manual') {
    const { storage, error: accessError } = localStorageAccess();
    if (!storage) {
      setOperation('error', `Recovery copy failed: ${storageMessage(accessError)}`);
      return null;
    }
    const key = `${HABIT_BACKUP_PREFIX}${new Date().toISOString().replace(/[:.]/g, '-')}`;
    try {
      storage.setItem(
        key,
        JSON.stringify({ reason, createdAt: new Date().toISOString(), data: serializable(state) })
      );
      setOperation('success', 'A local recovery copy was created.');
      return key;
    } catch (error) {
      setOperation('error', `Recovery copy failed: ${storageMessage(error)}`);
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
      setOperation(
        'error',
        `Reset failed. Existing data was left unchanged. ${storageMessage(error)}`
      );
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
