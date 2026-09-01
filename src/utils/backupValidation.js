/**
 * Validate / sanitize LifeStreak backup JSON before writing to localStorage.
 */

import { assertValidHabitDatabase } from '../habitTracker/domain';

export const BACKUP_STORAGE_KEYS = [
  'lifestreak-habit-tracker-v1',
  'ls-progress-storage',
  'ls-progress-settings',
  'ls-gamification-storage',
  'ls-goals-storage',
  'ls-memories-storage',
  'ls-service-storage',
  'ls-reading-storage',
];

export const BACKUP_STORE_VERSIONS = {
  'lifestreak-habit-tracker-v1': 1,
  'ls-progress-storage': 2,
  'ls-progress-settings': 1,
  'ls-gamification-storage': 1,
  'ls-goals-storage': 2,
  'ls-memories-storage': 1,
  'ls-service-storage': 1,
  'ls-reading-storage': 1,
};

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024; // 5 MB

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Zustand persist payloads are usually `{ state, version }` — accept either shape. */
export function unwrapPersistPayload(value) {
  if (!isPlainObject(value)) return null;
  if (isPlainObject(value.state)) return value.state;
  return value;
}

function validateProgressState(state) {
  if (!isPlainObject(state)) return false;
  const mapKeys = [
    'dailyTexts',
    'prayers',
    'familyWorship',
    'bibleReadings',
    'bibleChapters',
    'meetings',
    'weeklyReadings',
  ];
  return mapKeys.every((key) => state[key] === undefined || isPlainObject(state[key]));
}

function validateSettingsState(state) {
  if (!isPlainObject(state)) return false;
  if (state.theme !== undefined && state.theme !== 'light' && state.theme !== 'dark') {
    return false;
  }
  if (state.ai !== undefined) {
    if (!isPlainObject(state.ai)) return false;
    // Secrets must never be imported
    if (typeof state.ai.ollamaApiKey === 'string' && state.ai.ollamaApiKey.length > 0) {
      state.ai.ollamaApiKey = '';
    }
  }
  return true;
}

function validateGoalsState(state) {
  if (!isPlainObject(state)) return false;
  if (state.goals !== undefined && !Array.isArray(state.goals)) return false;
  if (state.projects !== undefined && !Array.isArray(state.projects)) return false;
  return true;
}

function validateMemoriesState(state) {
  if (!isPlainObject(state)) return false;
  if (state.memories !== undefined && !isPlainObject(state.memories)) return false;
  return true;
}

function validateGamificationState(state) {
  if (!isPlainObject(state)) return false;
  if (state.points !== undefined && typeof state.points !== 'number') return false;
  if (
    state.achievements !== undefined &&
    !isPlainObject(state.achievements) &&
    !Array.isArray(state.achievements)
  ) {
    return false;
  }
  return true;
}

function validateServiceState(state) {
  if (!isPlainObject(state) || (state.entries !== undefined && !Array.isArray(state.entries))) {
    return false;
  }
  return (state.entries || []).every(
    (entry) =>
      isPlainObject(entry) &&
      typeof entry.id === 'number' &&
      typeof entry.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
      typeof entry.hours === 'number' &&
      Number.isFinite(entry.hours) &&
      entry.hours >= 0 &&
      typeof entry.type === 'string' &&
      typeof entry.notes === 'string'
  );
}

function validateReadingState(state) {
  if (!isPlainObject(state) || (state.items !== undefined && !Array.isArray(state.items))) {
    return false;
  }
  return (state.items || []).every(
    (item) =>
      isPlainObject(item) &&
      typeof item.id === 'number' &&
      typeof item.title === 'string' &&
      ['book', 'audio', 'video', 'article'].includes(item.type) &&
      typeof item.totalUnits === 'number' &&
      Number.isFinite(item.totalUnits) &&
      item.totalUnits > 0 &&
      typeof item.completedUnits === 'number' &&
      Number.isFinite(item.completedUnits) &&
      item.completedUnits >= 0 &&
      item.completedUnits <= item.totalUnits &&
      typeof item.startedDate === 'string' &&
      typeof item.notes === 'string'
  );
}

const KEY_VALIDATORS = {
  'lifestreak-habit-tracker-v1': (state) => {
    try {
      assertValidHabitDatabase(state);
      return true;
    } catch {
      return false;
    }
  },
  'ls-progress-storage': validateProgressState,
  'ls-progress-settings': validateSettingsState,
  'ls-goals-storage': validateGoalsState,
  'ls-memories-storage': validateMemoriesState,
  'ls-gamification-storage': validateGamificationState,
  'ls-service-storage': validateServiceState,
  'ls-reading-storage': validateReadingState,
};

/**
 * @param {unknown} storeData - map of storage key → payload
 * @returns {{ ok: true, sanitized: Record<string, unknown> } | { ok: false, reason: string }}
 */
export function validateBackupStoreData(storeData) {
  if (!isPlainObject(storeData)) {
    return { ok: false, reason: 'Backup data must be an object' };
  }

  const sanitized = {};
  let accepted = 0;

  for (const key of Object.keys(storeData)) {
    if (!BACKUP_STORAGE_KEYS.includes(key)) {
      // Drop unknown keys (prototype pollution / unexpected stores)
      continue;
    }

    const raw = storeData[key];
    if (raw == null) continue;

    if (!isPlainObject(raw) && !Array.isArray(raw)) {
      return { ok: false, reason: `Invalid payload for ${key}` };
    }

    // Deep-clone to avoid mutating caller / shared refs
    let clone;
    try {
      clone = structuredClone(raw);
    } catch {
      return { ok: false, reason: `Could not clone payload for ${key}` };
    }

    const state = unwrapPersistPayload(clone);
    const supportedVersion = BACKUP_STORE_VERSIONS[key];
    if (
      isPlainObject(clone) &&
      clone.version !== undefined &&
      (!Number.isInteger(clone.version) || clone.version < 0 || clone.version > supportedVersion)
    ) {
      return {
        ok: false,
        reason: `Unsupported ${key} version ${String(clone.version)}; supported through ${supportedVersion}`,
      };
    }
    const validator = KEY_VALIDATORS[key];
    if (validator && state && !validator(state)) {
      return { ok: false, reason: `Schema validation failed for ${key}` };
    }

    // Re-wrap if original was persist-shaped
    if (isPlainObject(clone.state)) {
      clone.state = state;
      // Ensure API key remains empty in settings
      if (key === 'ls-progress-settings' && isPlainObject(clone.state?.ai)) {
        clone.state.ai.ollamaApiKey = '';
      }
      sanitized[key] = clone;
    } else {
      if (key === 'ls-progress-settings' && isPlainObject(clone.ai)) {
        clone.ai.ollamaApiKey = '';
      }
      sanitized[key] = clone;
    }
    accepted += 1;
  }

  if (accepted === 0) {
    return { ok: false, reason: 'No recognized store keys found in backup' };
  }

  return { ok: true, sanitized };
}

/**
 * Validate legacy `{ progress, settings }` format.
 */
export function validateLegacyBackup(storeData) {
  if (!isPlainObject(storeData)) return { ok: false, reason: 'Invalid legacy backup' };

  const out = {};
  if (storeData.progress) {
    const state = unwrapPersistPayload(storeData.progress) || storeData.progress;
    if (!validateProgressState(state)) {
      return { ok: false, reason: 'Invalid legacy progress payload' };
    }
    out.progress = structuredClone(storeData.progress);
  }
  if (storeData.settings) {
    const clone = structuredClone(storeData.settings);
    const state = unwrapPersistPayload(clone) || clone;
    if (!validateSettingsState(state)) {
      return { ok: false, reason: 'Invalid legacy settings payload' };
    }
    if (isPlainObject(clone.state?.ai)) clone.state.ai.ollamaApiKey = '';
    if (isPlainObject(clone.ai)) clone.ai.ollamaApiKey = '';
    out.settings = clone;
  }

  if (!out.progress && !out.settings) {
    return { ok: false, reason: 'Legacy backup missing progress/settings' };
  }

  return { ok: true, sanitized: out };
}
