import {
  Trash2,
  Download,
  Upload,
  Moon,
  Sun,
  Bell,
  BellOff,
  Clock,
  Flame,
  BookOpen,
  Heart,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
  X,
  Bot,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import useProgressStore from '../stores/progressStore.js';
import useSettingsStore, { type Notifications } from '../stores/settingsStore.js';
import { useToast } from '../components/Toast.jsx';
import { haptics } from '../utils/native.js';
import PageHeader from '../components/PageHeader.jsx';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  initializeReminders,
  cancelAllNotifications,
  showNotification,
} from '../utils/notifications.js';
import {
  NotificationItem,
  WeeklyNotificationItem,
} from '../components/settings/NotificationItems.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { validateOllamaBaseUrl } from '../utils/safeNavigation.js';
import {
  MAX_BACKUP_BYTES,
  validateBackupStoreData,
  validateLegacyBackup,
} from '../utils/backupValidation.js';
import {
  createPortableBackup,
  restorePortableBackup,
  validatePortableBackup,
} from '../utils/portableBackup.js';
import { parseJsonWithoutDuplicateKeys } from '../utils/strictJson.js';
import { clearDiagnostics, createDiagnosticsExport } from '../utils/diagnostics.js';

function Settings() {
  const toast = useToast();
  const { clearAll } = useProgressStore();
  const {
    notificationsEnabled,
    notifications,
    theme,
    ai,
    setNotificationsEnabled,
    toggleNotification,
    setNotificationTime,
    setTheme,
    setAiSettings,
  } = useSettingsStore();

  const [showApiKey, setShowApiKey] = useState(false);
  const [aiTestStatus, setAiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>(
    'idle'
  );
  const [aiTransmissionConfirmed, setAiTransmissionConfirmed] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [notificationPermission, setNotificationPermission] = useState(() =>
    getNotificationPermission()
  );
  const [notificationSupported] = useState(() => isNotificationSupported());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      const settings = useSettingsStore.getState();
      initializeReminders(settings);
      toast.success('Notifications enabled');
    } else {
      toast.error('Permission denied');
    }
  };

  const handleDisableNotifications = async () => {
    setNotificationsEnabled(false);
    await cancelAllNotifications();
    toast.info('Notifications disabled');
  };

  const handleTestNotification = async () => {
    const shown = await showNotification('LifeStreak reminder', {
      body: 'A private LifeStreak reminder is ready.',
      tag: 'lifestreak-settings-test',
    });
    if (shown) toast.success('Test reminder sent');
    else toast.error('Test reminder could not be shown. Check system notification settings.');
  };

  const handleToggleNotification = (key: string) => {
    toggleNotification(key as keyof Notifications);
    haptics.light();
  };

  const handleSetNotificationTime = (key: string, time: string) => {
    setNotificationTime(key as keyof Notifications, time);
  };

  const handleClearData = () => {
    setShowClearConfirm(true);
  };

  const confirmClearData = () => {
    clearAll();
    setShowClearConfirm(false);
    toast.success('Spiritual progress cleared; other LifeStreak stores were preserved');
    window.location.reload();
  };

  const handleUpdateApp = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      toast.success('Checking for updates...');
      window.location.reload();
    } catch (error) {
      console.error('Update check failed:', error);
      toast.error('Could not clear cache. Try again.');
    }
  };

  const handleTestAi = async () => {
    if (!aiTransmissionConfirmed || ai.provider !== 'ollama') {
      toast.error('Review and confirm the connection-test data flow first');
      return;
    }
    setAiTestStatus('testing');
    try {
      const baseUrl = ai.ollamaBaseUrl || 'https://ollama.com';
      const urlCheck = validateOllamaBaseUrl(baseUrl);
      if (!urlCheck.ok) {
        setAiTestStatus('error');
        toast.error(urlCheck.reason);
        return;
      }

      const apiKey = ai.ollamaApiKey;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const response = await fetch(`${urlCheck.url.origin}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: ai.ollamaModel || 'llama3.2',
          messages: [{ role: 'user', content: 'Say "OK" in one word.' }],
          stream: false,
        }),
      });

      if (response.ok) {
        setAiTestStatus('success');
        toast.success('AI connection successful');
      } else {
        const err = await response.text();
        setAiTestStatus('error');
        toast.error(`AI error: ${response.status}`);
        console.error('Ollama test failed:', err);
      }
    } catch (error) {
      setAiTestStatus('error');
      toast.error('AI connection failed');
      console.error('Ollama test error:', error);
    }
  };

  const handleExportData = () => {
    try {
      const exportData = createPortableBackup();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifestreak-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported (API keys excluded)');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(error instanceof Error ? error.message : 'Could not export data');
    }
  };

  const handleExportDiagnostics = () => {
    const blob = new Blob([JSON.stringify(createDiagnosticsExport(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `lifestreak-diagnostics-${new Date().toISOString().split('T')[0]}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Sanitized local diagnostics exported');
  };

  const [importModal, setImportModal] = useState<{
    data: any;
    isOldFormat: boolean;
    storeCount: number;
  } | null>(null);
  const pendingImportData = useRef<any>(null);

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > MAX_BACKUP_BYTES) {
        toast.error('Backup file is too large');
        return;
      }
      try {
        const text = await file.text();
        const parsed = parseJsonWithoutDuplicateKeys(text);

        if (parsed.product === 'LifeStreak' && parsed.formatVersion !== undefined) {
          const portable = validatePortableBackup(parsed);
          if (!portable.ok) {
            toast.error(portable.reason);
            return;
          }
          pendingImportData.current = parsed;
          setImportModal({
            data: parsed,
            isOldFormat: false,
            storeCount: Object.keys(portable.sanitized).length,
          });
          return;
        }

        // Support the previous versioned wrapper and legacy progress/settings shape.
        let isOldFormat = false;
        let storeData = parsed;

        if (parsed.version !== undefined && parsed.data !== undefined) {
          if (parsed.version !== 1) {
            toast.error(`Unsupported older backup wrapper version ${String(parsed.version)}`);
            return;
          }
          storeData = parsed.data;
        } else {
          // Legacy format: raw store keys at top level
          isOldFormat = !!(parsed.progress || parsed.settings);
        }

        if (isOldFormat) {
          const legacy = validateLegacyBackup(storeData);
          if (!legacy.ok) {
            toast.error(legacy.reason);
            return;
          }
          storeData = {};
          if (legacy.sanitized.progress) {
            storeData['ls-progress-storage'] = legacy.sanitized.progress;
          }
          if (legacy.sanitized.settings) {
            storeData['ls-progress-settings'] = legacy.sanitized.settings;
          }
        } else {
          const validated = validateBackupStoreData(storeData);
          if (!validated.ok) {
            toast.error(validated.reason);
            return;
          }
          storeData = validated.sanitized;
        }

        pendingImportData.current = {
          product: 'LifeStreak',
          formatVersion: 1,
          exportedAt: parsed.exportedAt,
          stores: storeData,
        };
        setImportModal({ data: parsed, isOldFormat, storeCount: Object.keys(storeData).length });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to import data');
      }
    };
    input.click();
  };

  const confirmImport = () => {
    if (!pendingImportData.current) return;
    try {
      restorePortableBackup(pendingImportData.current);
      setImportModal(null);
      pendingImportData.current = null;
      toast.success('Validated backup restored atomically. Refreshing...');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed. No data was changed.');
    }
  };

  const cancelImport = () => {
    setImportModal(null);
    pendingImportData.current = null;
    toast.info('Import cancelled');
  };

  return (
    <div className="min-h-screen bg-base-200 pb-24">
      <PageHeader
        title="Settings"
        subtitle="Customize your experience"
        gradient="from-primary via-primary to-secondary"
        shadow
        noBlurs
      />
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-2xl">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">
              <Bell className="w-5 h-5" /> Notifications
            </h2>
            <div className="divider my-2"></div>
            {!notificationSupported ? (
              <div className="alert alert-warning">Notifications not supported.</div>
            ) : notificationPermission === 'denied' ? (
              <div className="alert alert-error" role="status">
                Notifications are blocked in system settings. LifeStreak will not ask again; enable
                them from the browser or device settings if you change your mind.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-base-200/50 rounded-xl">
                  <div>
                    <p className="font-medium">Enable Reminders</p>
                    <p className="text-xs text-base-content/60">
                      Permission is requested only after Enable. Lock-screen text stays generic.
                    </p>
                  </div>
                  {notificationsEnabled ? (
                    <button onClick={handleDisableNotifications} className="btn btn-sm btn-outline">
                      Disable
                    </button>
                  ) : (
                    <button onClick={handleEnableNotifications} className="btn btn-sm btn-primary">
                      Enable
                    </button>
                  )}
                </div>
                {notificationsEnabled && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleTestNotification}
                      className="btn btn-sm btn-outline w-full"
                    >
                      Send private test reminder
                    </button>
                    <NotificationItem
                      icon={BookOpen}
                      label="Daily Text"
                      enabled={notifications?.dailyText?.enabled ?? true}
                      onToggle={() => handleToggleNotification('dailyText')}
                      onTimeChange={(time) => handleSetNotificationTime('dailyText', time)}
                      time={notifications?.dailyText?.time ?? '07:00'}
                    />
                    <NotificationItem
                      icon={Heart}
                      label="Bible Reading"
                      enabled={notifications?.bibleReading?.enabled ?? true}
                      onToggle={() => handleToggleNotification('bibleReading')}
                      onTimeChange={(time) => handleSetNotificationTime('bibleReading', time)}
                      time={notifications?.bibleReading?.time ?? '20:00'}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">Private Diagnostics</h2>
            <p className="text-sm text-base-content/70">
              Up to 20 sanitized failures are kept locally for 30 days. Raw messages, stacks, full
              URLs, user-agent strings, habits, notes, and values are excluded.
            </p>
            <button
              type="button"
              onClick={handleExportDiagnostics}
              className="btn btn-outline w-full justify-start"
            >
              <Download className="w-5 h-5" /> Export Sanitized Diagnostics
            </button>
            <button
              type="button"
              onClick={() => {
                clearDiagnostics();
                toast.success('Local diagnostics deleted');
              }}
              className="btn btn-outline w-full justify-start"
            >
              <Trash2 className="w-5 h-5" /> Delete Local Diagnostics
            </button>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">Appearance</h2>
            <div className="divider my-2"></div>
            <button onClick={toggleTheme} className="btn btn-outline w-full justify-start">
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">Data Management</h2>
            <div className="divider my-2"></div>
            <button onClick={handleExportData} className="btn btn-outline w-full justify-start">
              <Download className="w-5 h-5" /> Export Data
            </button>
            <button onClick={handleImportData} className="btn btn-outline w-full justify-start">
              <Upload className="w-5 h-5" /> Import Data
            </button>
            <button
              onClick={handleClearData}
              className="btn btn-error btn-outline w-full justify-start"
            >
              <Trash2 className="w-5 h-5" /> Clear Spiritual Progress
            </button>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">
              <Bot className="w-5 h-5" /> AI Assistant
            </h2>
            <div className="divider my-2"></div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-base-200/50 rounded-xl">
                <div>
                  <p className="font-medium">AI Provider</p>
                </div>
                <select
                  id="ai-provider"
                  aria-label="AI provider"
                  className="select select-sm select-bordered"
                  value={ai.provider}
                  onChange={(e) => {
                    const provider = e.target.value as 'ollama' | 'none';
                    setAiTransmissionConfirmed(false);
                    setAiSettings(
                      provider === 'none' ? { provider, ollamaApiKey: '' } : { provider }
                    );
                  }}
                >
                  <option value="none">Disabled</option>
                  <option value="ollama">Ollama Cloud / Local</option>
                </select>
              </div>
              {ai.provider === 'ollama' && (
                <>
                  <div className="space-y-1">
                    <label
                      htmlFor="ollama-base-url"
                      className="text-sm font-medium text-base-content/70"
                    >
                      Base URL
                    </label>
                    <input
                      id="ollama-base-url"
                      type="text"
                      className="input input-bordered input-sm w-full"
                      value={ai.ollamaBaseUrl}
                      onChange={(e) => {
                        setAiTransmissionConfirmed(false);
                        setAiSettings({ ollamaBaseUrl: e.target.value });
                      }}
                      onBlur={() => {
                        const check = validateOllamaBaseUrl(ai.ollamaBaseUrl);
                        if (ai.ollamaBaseUrl && !check.ok) {
                          toast.error(check.reason);
                        }
                      }}
                      placeholder="https://ollama.com or http://localhost:11434"
                    />
                    <p className="text-xs text-base-content/50">
                      Allowed: ollama.com (HTTPS) or localhost / 127.0.0.1
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="ollama-api-key"
                      className="text-sm font-medium text-base-content/70"
                    >
                      API Key
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="ollama-api-key"
                        type={showApiKey ? 'text' : 'password'}
                        className="input input-bordered input-sm flex-1"
                        value={ai.ollamaApiKey}
                        onChange={(e) => setAiSettings({ ollamaApiKey: e.target.value })}
                        placeholder="Ollama Cloud API key (not needed for local)"
                        autoComplete="off"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="btn btn-sm btn-ghost"
                        aria-label={showApiKey ? 'Hide Ollama API key' : 'Show Ollama API key'}
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-base-content/50">
                      Stored for this session only — never written to backups or localStorage.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="ollama-model"
                      className="text-sm font-medium text-base-content/70"
                    >
                      Model
                    </label>
                    <input
                      id="ollama-model"
                      type="text"
                      className="input input-bordered input-sm w-full"
                      value={ai.ollamaModel}
                      onChange={(e) => {
                        setAiTransmissionConfirmed(false);
                        setAiSettings({ ollamaModel: e.target.value });
                      }}
                      placeholder="llama3.2, mistral-small3.1, deepseek-r1, etc."
                    />
                    <p className="text-xs text-base-content/50">
                      Cloud models: llama3.2, llama3.3, mistral-small3.1, qwen3, gemma3, phi4,
                      deepseek-r1
                    </p>
                  </div>
                  <label className="flex items-start gap-3 rounded-xl border border-base-300 p-3 text-sm">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm mt-0.5"
                      checked={aiTransmissionConfirmed}
                      onChange={(event) => setAiTransmissionConfirmed(event.target.checked)}
                    />
                    <span>
                      I understand that Test Connection sends the selected model name and the fixed
                      text “Say OK in one word” to the validated Base URL. If entered, the API key
                      is sent as an authorization header. No habit, note, service, reading, goal, or
                      memory data is included.
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleTestAi}
                    disabled={aiTestStatus === 'testing' || !aiTransmissionConfirmed}
                    className="btn btn-outline btn-sm w-full gap-2"
                  >
                    {aiTestStatus === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {aiTestStatus === 'success' && (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    )}
                    {aiTestStatus === 'error' && <XCircle className="w-4 h-4 text-error" />}
                    Test Connection
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-lg">
              <RefreshCw className="w-5 h-5" /> App Updates
            </h2>
            <div className="divider my-2"></div>
            <button onClick={handleUpdateApp} className="btn btn-primary w-full justify-start">
              <RefreshCw className="w-5 h-5" /> Check for Updates
            </button>
          </div>
        </div>
      </div>

      {/* Import Confirmation Modal */}
      {importModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className="card bg-base-100 shadow-2xl w-full max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="collections-import-heading"
          >
            <div className="card-body">
              <div className="flex items-center justify-between mb-2">
                <h3
                  id="collections-import-heading"
                  className="font-bold text-lg flex items-center gap-2"
                >
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Import Data
                </h3>
                <button
                  type="button"
                  onClick={cancelImport}
                  className="btn btn-ghost btn-sm btn-circle"
                  aria-label="Cancel import"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="divider my-1"></div>
              {importModal.isOldFormat && (
                <div className="alert alert-info mb-3">
                  <span className="text-sm">
                    This is a legacy backup file. Only progress and settings data will be imported.
                  </span>
                </div>
              )}
              <p className="text-base-content/70 mb-4">
                {importModal.storeCount} validated LifeStreak store
                {importModal.storeCount === 1 ? '' : 's'} will be restored. A verified local
                recovery snapshot is created first; any failed write rolls every store back.
              </p>
              {importModal.data.exportedAt && (
                <p className="text-xs text-base-content/50 mb-4">
                  Backup created: {new Date(importModal.data.exportedAt).toLocaleString()}
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <button onClick={cancelImport} className="btn btn-ghost">
                  Cancel
                </button>
                <button onClick={confirmImport} className="btn btn-error">
                  Replace Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={showClearConfirm}
        title="Clear spiritual progress?"
        description="Clears Daily Text, prayer, worship, Bible-reading, and meeting-preparation progress. Habits, goals, service, reading, memories, settings, diagnostics, and notification schedules are not changed."
        confirmLabel="Clear progress"
        cancelLabel="Keep progress"
        tone="danger"
        onConfirm={confirmClearData}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
export default Settings;
