/**
 * usePWA Hook
 * Manages PWA state including install prompt, updates, and connectivity
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isPWACapable,
  isInstalled,
  isOnline as checkOnline,
  setDeferredPrompt,
  getDeferredPrompt,
  triggerInstallPrompt,
  registerConnectivityListeners,
  checkForUpdates,
  forceUpdate,
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
} from '../utils/pwa';

export function usePWA() {
  const [canInstall, setCanInstall] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(isInstalled());
  const [isOnline, setIsOnline] = useState(checkOnline());
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission());

  // Handle beforeinstallprompt event
  useEffect(() => {
    if (!isPWACapable()) return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle connectivity changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    return registerConnectivityListeners(handleOnline, handleOffline);
  }, []);

  // Listen for service worker updates
  useEffect(() => {
    if (!isPWACapable() || !('serviceWorker' in navigator)) return;

    let cancelled = false;
    let registration = null;
    let installingWorker = null;

    const handleControllerChange = () => {
      setUpdateAvailable(true);
    };

    const handleStateChange = () => {
      if (installingWorker?.state === 'installed' && navigator.serviceWorker.controller) {
        setUpdateAvailable(true);
      }
    };

    const handleUpdateFound = () => {
      if (!registration) return;
      if (installingWorker) {
        installingWorker.removeEventListener('statechange', handleStateChange);
      }
      installingWorker = registration.installing;
      if (installingWorker) {
        installingWorker.addEventListener('statechange', handleStateChange);
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    navigator.serviceWorker.ready
      .then((reg) => {
        if (cancelled) return;
        registration = reg;
        if (registration.waiting) {
          setUpdateAvailable(true);
        }
        registration.addEventListener('updatefound', handleUpdateFound);
      })
      .catch(() => {
        // Ignore SW readiness failures (private mode, etc.)
      });

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      if (registration) {
        registration.removeEventListener('updatefound', handleUpdateFound);
      }
      if (installingWorker) {
        installingWorker.removeEventListener('statechange', handleStateChange);
      }
    };
  }, []);

  // Prompt to install the app
  const promptInstall = useCallback(async () => {
    if (!getDeferredPrompt()) {
      return { success: false, reason: 'no-prompt' };
    }

    const result = await triggerInstallPrompt();

    if (result.outcome === 'accepted') {
      setCanInstall(false);
      return { success: true };
    }

    return { success: false, reason: result.outcome };
  }, []);

  // Apply pending update
  const applyUpdate = useCallback(() => {
    forceUpdate();
  }, []);

  // Check for updates manually
  const checkUpdates = useCallback(async () => {
    await checkForUpdates();
  }, []);

  // Request notification permission
  const requestNotifications = useCallback(async () => {
    const result = await requestNotificationPermission();
    setNotificationPermission(getNotificationPermission());
    return result;
  }, []);

  return {
    // State
    canInstall,
    isAppInstalled,
    isOnline,
    updateAvailable,
    isPWACapable: isPWACapable(),
    notificationPermission,
    notificationsSupported: isNotificationSupported(),

    // Actions
    promptInstall,
    applyUpdate,
    checkUpdates,
    requestNotifications,
  };
}

export default usePWA;
