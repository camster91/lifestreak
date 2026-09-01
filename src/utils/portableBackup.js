import {
  BACKUP_STORAGE_KEYS,
  BACKUP_STORE_VERSIONS,
  validateBackupStoreData,
} from './backupValidation.js';
import { redactSettingsSecrets } from '../stores/settingsStore';

export const PORTABLE_BACKUP_FORMAT_VERSION = 1;
export const PORTABLE_RECOVERY_PREFIX = 'lifestreak-portable-recovery-';

function requireStorage(storage) {
  if (!storage?.getItem || !storage?.setItem || !storage?.removeItem) {
    throw new Error('Local storage is unavailable. No data was changed.');
  }
  return storage;
}

function verifiedSet(storage, key, raw) {
  storage.setItem(key, raw);
  if (storage.getItem(key) !== raw) throw new Error(`The write for ${key} could not be verified.`);
}

function exactSnapshot(storage) {
  return Object.fromEntries(BACKUP_STORAGE_KEYS.map((key) => [key, storage.getItem(key)]));
}

export function createPortableBackup(storage = globalThis.localStorage) {
  const target = requireStorage(storage);
  const stores = {};
  for (const key of BACKUP_STORAGE_KEYS) {
    const raw = target.getItem(key);
    if (raw === null) continue;
    try {
      const parsed = JSON.parse(raw);
      stores[key] = key === 'ls-progress-settings' ? redactSettingsSecrets(parsed) : parsed;
    } catch {
      throw new Error(`${key} is malformed. Download its recovery data before exporting.`);
    }
  }
  if (!Object.keys(stores).length) throw new Error('There is no LifeStreak data to export.');
  const validation = validateBackupStoreData(stores);
  if (!validation.ok) {
    throw new Error(`${validation.reason}. Download the affected store's recovery data first.`);
  }
  return {
    product: 'LifeStreak',
    formatVersion: PORTABLE_BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    storeSchemas: BACKUP_STORE_VERSIONS,
    stores: validation.sanitized,
  };
}

export function validatePortableBackup(payload) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    payload.product !== 'LifeStreak' ||
    payload.formatVersion !== PORTABLE_BACKUP_FORMAT_VERSION
  ) {
    return {
      ok: false,
      reason: `Unsupported portable backup. This app supports LifeStreak format ${PORTABLE_BACKUP_FORMAT_VERSION}.`,
    };
  }
  const validated = validateBackupStoreData(payload.stores);
  if (!validated.ok) return validated;
  return { ok: true, sanitized: validated.sanitized };
}

export function restorePortableBackup(payload, storage = globalThis.localStorage) {
  const target = requireStorage(storage);
  const validation = validatePortableBackup(payload);
  if (!validation.ok) throw new Error(`${validation.reason}. No data was changed.`);

  const before = exactSnapshot(target);
  const recoveryKey = `${PORTABLE_RECOVERY_PREFIX}${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const recoveryRaw = JSON.stringify({
    product: 'LifeStreak',
    reason: 'before-portable-import',
    createdAt: new Date().toISOString(),
    rawStores: before,
  });
  verifiedSet(target, recoveryKey, recoveryRaw);

  const writes = Object.fromEntries(
    Object.entries(validation.sanitized).map(([key, value]) => [key, JSON.stringify(value)])
  );
  try {
    for (const key of BACKUP_STORAGE_KEYS) {
      const raw = writes[key];
      if (raw === undefined) {
        target.removeItem(key);
        if (target.getItem(key) !== null)
          throw new Error(`The removal for ${key} could not be verified.`);
      } else {
        verifiedSet(target, key, raw);
      }
    }
    return { recoveryKey, importedKeys: Object.keys(writes) };
  } catch (error) {
    const rollbackErrors = [];
    for (const [key, raw] of Object.entries(before)) {
      try {
        if (raw === null) {
          target.removeItem(key);
          if (target.getItem(key) !== null) {
            throw new Error('remove could not be verified', { cause: error });
          }
        } else {
          verifiedSet(target, key, raw);
        }
      } catch (rollbackError) {
        rollbackErrors.push(
          `${key}: ${rollbackError instanceof Error ? rollbackError.message : 'failed'}`
        );
      }
    }
    if (rollbackErrors.length) {
      throw new Error(
        `Import failed and rollback needs recovery. Preserve ${recoveryKey}. ${rollbackErrors.join('; ')}`,
        { cause: error }
      );
    }
    throw new Error(
      `Import failed and every original store was restored. ${error instanceof Error ? error.message : ''}`.trim(),
      { cause: error }
    );
  }
}
