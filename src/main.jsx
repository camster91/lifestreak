import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { logWebVitals } from './utils/webVitals.js';
import { initializeNative, isNative, appLifecycle } from './utils/native.js';
import { sanitizeSameOriginPath } from './utils/safeNavigation.js';
import { recordDiagnostic } from './utils/diagnostics.js';
import useSettingsStore from './stores/settingsStore';

function logGlobalError(type, error) {
  recordDiagnostic(type, error);
  // Log to console in development
  if (import.meta.env.DEV) {
    console.error(`[${type}]`, error);
  }
}

// Global error handler for uncaught exceptions
window.onerror = function (message, source, lineno, colno, error) {
  logGlobalError('uncaught_exception', error || new Error(String(message)));
  return false; // Let the error propagate
};

// Global handler for unhandled promise rejections
window.onunhandledrejection = function (event) {
  const error = event.reason;
  logGlobalError('unhandled_rejection', error);
};


function applyPersistedTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') return;
  document.documentElement.setAttribute('data-theme', theme);
}

// Apply theme before first paint when possible, and keep it in sync after rehydrate.
applyPersistedTheme(useSettingsStore.getState().theme);
if (useSettingsStore.persist?.onFinishHydration) {
  useSettingsStore.persist.onFinishHydration(() => {
    applyPersistedTheme(useSettingsStore.getState().theme);
  });
}
useSettingsStore.subscribe((state) => {
  applyPersistedTheme(state.theme);
});

// Initialize native mobile features
initializeNative().catch((error) => {
  recordDiagnostic('native_init', error);
  if (import.meta.env.DEV) console.error(error);
});

// Handle back button on Android
if (isNative) {
  let lastBackPress = 0;
  appLifecycle.onBackButton(({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      // Double-tap to exit
      const now = Date.now();
      if (now - lastBackPress < 2000) {
        appLifecycle.exit();
      } else {
        lastBackPress = now;
        // Could show a toast here: "Press back again to exit"
      }
    }
  });
}

// Create root and render
const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Report Web Vitals metrics in development
logWebVitals();

// Register service worker update handler
if ('serviceWorker' in navigator) {
  let reloadingForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadingForUpdate) return;
    reloadingForUpdate = true;
    // A user-approved worker activated; reload exactly once to use its immutable app shell.
    window.location.reload();
  });

  // Handle notification clicks — focus app window (same-origin paths only)
  navigator.serviceWorker.addEventListener('message', (event) => {
    // Only accept messages from our own service worker controller
    if (
      event.source &&
      navigator.serviceWorker.controller &&
      event.source !== navigator.serviceWorker.controller
    ) {
      return;
    }
    if (event.data?.type === 'NOTIFICATION_CLICK') {
      const url = sanitizeSameOriginPath(event.data.url || '/');
      window.focus();
      window.location.href = url;
    }
  });
}

// Listen for notification clicks directly (for when SW isn't controlling)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready
    .then(() => {
      // No-op: registration ready for notification scheduling
    })
    .catch(() => {});
}
