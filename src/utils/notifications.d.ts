export declare function isNotificationSupported(): boolean;
export type LifeStreakNotificationPermission =
  NotificationPermission | 'prompt' | 'unsupported' | 'error';
export declare function getNotificationPermission(): LifeStreakNotificationPermission;
export declare function checkNotificationPermission(): Promise<LifeStreakNotificationPermission>;
export declare function requestNotificationPermission(): Promise<LifeStreakNotificationPermission>;
export declare function initializeReminders(
  settings: object
): Promise<Array<{ cancel: () => void }>>;
export declare function cancelAllNotifications(): Promise<void>;
export declare function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<boolean>;
