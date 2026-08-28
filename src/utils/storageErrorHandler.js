export const STORAGE_STATUS_EVENT = 'lifestreak:storage-status';

const pendingRecovery = new Map();
let latestFailure = null;

function errorMessage(error) {
  if (error instanceof Error && error.message) return error.message;
  return 'Local storage is unavailable.';
}

function publishStorageStatus(detail) {
  latestFailure = detail.status === 'recovered' ? null : detail;
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(STORAGE_STATUS_EVENT, { detail }));
  }
}

function rememberRecovery(storeName, key, value, operation, error) {
  pendingRecovery.set(storeName, {
    storeName,
    key,
    value,
    operation,
    capturedAt: new Date().toISOString(),
  });
  publishStorageStatus({
    storeName,
    operation,
    status: 'error',
    message: errorMessage(error),
    recoveryAvailable: true,
  });
}

export function createStorageErrorHandler(storeName) {
  return function onStorageError(error) {
    publishStorageStatus({
      storeName,
      operation: 'storage',
      status: 'error',
      message: errorMessage(error),
      recoveryAvailable: pendingRecovery.has(storeName),
    });
    console.error(`[LifeStreak storage] ${storeName}:`, error);
  };
}

export function getStorageRecovery(storeName) {
  return pendingRecovery.get(storeName) || null;
}

export function getLatestStorageFailure() {
  return latestFailure;
}

export function exportStorageRecovery(storeName) {
  const recovery = getStorageRecovery(storeName);
  return recovery ? JSON.stringify(recovery, null, 2) : null;
}

export function retryStorageWrite(storeName) {
  const recovery = getStorageRecovery(storeName);
  if (!recovery || recovery.operation !== 'write') return false;
  try {
    localStorage.setItem(recovery.key, recovery.value);
    if (localStorage.getItem(recovery.key) !== recovery.value) {
      throw new Error('The saved value could not be verified.');
    }
    pendingRecovery.delete(storeName);
    publishStorageStatus({
      storeName,
      operation: 'write',
      status: 'recovered',
      message: 'The pending data was saved successfully.',
      recoveryAvailable: false,
    });
    return true;
  } catch (error) {
    rememberRecovery(storeName, recovery.key, recovery.value, 'write', error);
    return false;
  }
}

export function clearStorageRecoveryForTests() {
  pendingRecovery.clear();
  latestFailure = null;
}

/**
 * JSON-string storage for Zustand. Failed writes remain available for retry/export;
 * this adapter never evicts another LifeStreak data set to make space.
 */
export function createSafeStorage(storeName) {
  return {
    getItem: (name) => {
      try {
        const value = localStorage.getItem(name);
        if (value !== null) {
          try {
            JSON.parse(value);
          } catch (error) {
            // Keep the original value at its key and make it downloadable for recovery.
            rememberRecovery(storeName, name, value, 'read-corrupt', error);
            return null;
          }
        }
        return value;
      } catch (error) {
        rememberRecovery(storeName, name, '', 'read', error);
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        localStorage.setItem(name, value);
        if (localStorage.getItem(name) !== value) {
          throw new Error('The saved value could not be verified.');
        }
        pendingRecovery.delete(storeName);
      } catch (error) {
        rememberRecovery(storeName, name, value, 'write', error);
      }
    },
    removeItem: (name) => {
      try {
        localStorage.removeItem(name);
      } catch (error) {
        publishStorageStatus({
          storeName,
          operation: 'remove',
          status: 'error',
          message: errorMessage(error),
          recoveryAvailable: pendingRecovery.has(storeName),
        });
      }
    },
  };
}
