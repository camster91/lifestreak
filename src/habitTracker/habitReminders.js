import { isScheduledOnDate, toLocalDate } from './engine';
import {
  isNativeNotificationPlatform,
  PRIVATE_REMINDER_BODY,
  PRIVATE_REMINDER_TITLE,
  replaceNativeHabitNotifications,
} from '../utils/notifications';

export const HABIT_REMINDER_HORIZON_DAYS = 30;
export const HABIT_REMINDER_LIMIT = 60;
const HABIT_REMINDER_ID_MIN = 100_000;
const HABIT_REMINDER_ID_MAX = 2_000_000_000;

function addLocalDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function notificationDate(date, time) {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
}

function stablePositiveId(value, usedIds) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const range = HABIT_REMINDER_ID_MAX - HABIT_REMINDER_ID_MIN;
  let id = HABIT_REMINDER_ID_MIN + ((hash >>> 0) % range);
  while (usedIds.has(id)) {
    id = id >= HABIT_REMINDER_ID_MAX ? HABIT_REMINDER_ID_MIN : id + 1;
  }
  usedIds.add(id);
  return id;
}

export function planHabitNotifications(snapshot, now = new Date()) {
  const candidates = [];
  const weekStartsOn = snapshot.preferences?.weekStartsOn ?? 1;
  const showNames = snapshot.preferences?.showHabitNamesInNotifications === true;

  for (let offset = 0; offset < HABIT_REMINDER_HORIZON_DAYS; offset += 1) {
    const date = addLocalDays(now, offset);
    const dateKey = toLocalDate(date);
    for (const habit of snapshot.habits || []) {
      if (!habit.reminderTime) continue;
      if (!isScheduledOnDate(habit, dateKey, snapshot.logs || [], weekStartsOn)) continue;
      const at = notificationDate(date, habit.reminderTime);
      if (at <= now) continue;
      candidates.push({ habit, dateKey, at });
    }
  }

  const usedIds = new Set();
  return candidates
    .sort((left, right) => left.at - right.at || left.habit.id.localeCompare(right.habit.id))
    .slice(0, HABIT_REMINDER_LIMIT)
    .map(({ habit, dateKey, at }) => ({
      id: stablePositiveId(`${habit.id}:${dateKey}:${habit.reminderTime}`, usedIds),
      title: PRIVATE_REMINDER_TITLE,
      body: showNames ? `${habit.name} is ready when you are.` : PRIVATE_REMINDER_BODY,
      schedule: { at, allowWhileIdle: true },
      sound: null,
      attachments: null,
      actionTypeId: '',
      extra: { habitId: habit.id, date: dateKey },
    }));
}

let reconciliation = Promise.resolve();

export function reconcileHabitNotifications(snapshot, now = new Date()) {
  if (!isNativeNotificationPlatform()) {
    return Promise.resolve({ scheduled: 0, permission: 'unsupported' });
  }
  const planned = planHabitNotifications(snapshot, now);
  reconciliation = reconciliation
    .catch(() => undefined)
    .then(() => replaceNativeHabitNotifications(planned));
  return reconciliation;
}
