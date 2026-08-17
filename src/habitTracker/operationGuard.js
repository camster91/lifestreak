import { habitStore } from './store';

const originalGetSnapshot = habitStore.getSnapshot.bind(habitStore);
const originalDismissOperation = habitStore.dismissOperation.bind(habitStore);
let informationalNotice = null;
let suppressInformationalNotices = 0;
let cachedBase = null;
let cachedNotice = null;
let cachedSnapshot = null;

function clearInformationalNotice() {
  informationalNotice = null;
  cachedBase = null;
  cachedNotice = null;
  cachedSnapshot = null;
}

function showInformationalNotice(message) {
  if (suppressInformationalNotices > 0) return;
  informationalNotice = {
    type: 'info',
    message,
    at: new Date().toISOString(),
  };
  cachedBase = null;
  cachedNotice = null;
  cachedSnapshot = null;
  originalDismissOperation();
}

habitStore.getSnapshot = () => {
  const base = originalGetSnapshot();
  if (!informationalNotice) return base;
  if (base === cachedBase && informationalNotice === cachedNotice) return cachedSnapshot;
  cachedBase = base;
  cachedNotice = informationalNotice;
  cachedSnapshot = { ...base, operation: informationalNotice };
  return cachedSnapshot;
};

habitStore.dismissOperation = () => {
  clearInformationalNotice();
  return originalDismissOperation();
};

const undoableMethods = [
  'createHabit',
  'updateHabit',
  'setLifecycle',
  'deleteHabit',
  'moveHabit',
  'setDayStatus',
  'addValue',
  'removeValue',
  'clearDay',
  'setNote',
  'addTemplate',
  'addAllStarterTemplates',
  'importData',
  'resetAllData',
  'undo',
];

undoableMethods.forEach((methodName) => {
  const original = habitStore[methodName]?.bind(habitStore);
  if (!original) return;
  habitStore[methodName] = (...args) => {
    clearInformationalNotice();
    suppressInformationalNotices += 1;
    try {
      return original(...args);
    } finally {
      suppressInformationalNotices -= 1;
      clearInformationalNotice();
    }
  };
});

const originalSetPreference = habitStore.setPreference.bind(habitStore);
habitStore.setPreference = (...args) => {
  const result = originalSetPreference(...args);
  if (result) showInformationalNotice('Preference saved.');
  return result;
};

const originalDismissOnboarding = habitStore.dismissOnboarding.bind(habitStore);
habitStore.dismissOnboarding = (...args) => {
  const result = originalDismissOnboarding(...args);
  if (result) showInformationalNotice('Starter suggestions were dismissed.');
  return result;
};

const originalReopenOnboarding = habitStore.reopenOnboarding?.bind(habitStore);
if (originalReopenOnboarding) {
  habitStore.reopenOnboarding = (...args) => {
    clearInformationalNotice();
    const result = originalReopenOnboarding(...args);
    if (result) showInformationalNotice('Starter suggestions are available again.');
    return result;
  };
}

const originalScanLegacyData = habitStore.scanLegacyData.bind(habitStore);
habitStore.scanLegacyData = (...args) => {
  const result = originalScanLegacyData(...args);
  if (originalGetSnapshot().operation?.type === 'error') {
    clearInformationalNotice();
    return result;
  }

  const count = Array.isArray(result) ? result.length : 0;
  showInformationalNotice(
    count
      ? `${count} existing LifeStreak data ${count === 1 ? 'store was' : 'stores were'} detected and left unchanged.`
      : 'No existing LifeStreak specialist stores were detected.',
  );
  return result;
};

const originalCreateRecoveryBackup = habitStore.createRecoveryBackup.bind(habitStore);
habitStore.createRecoveryBackup = (...args) => {
  clearInformationalNotice();
  const result = originalCreateRecoveryBackup(...args);
  if (result) showInformationalNotice('A local recovery copy was created.');
  return result;
};
