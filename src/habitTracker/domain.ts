import {
  EXPLICIT_LOG_STATUSES,
  HABIT_SCHEMA_VERSION,
  LIFECYCLE_STATES,
  TIME_GROUPS,
  TRACKING_TYPES,
  isValidLocalDate,
} from './engine.js';

export type TrackingType = (typeof TRACKING_TYPES)[number];
export type TimeGroup = (typeof TIME_GROUPS)[number];
export type LifecycleState = (typeof LIFECYCLE_STATES)[number];
export type ExplicitLogStatus = (typeof EXPLICIT_LOG_STATUSES)[number];

export interface Habit {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  timeOfDay: TimeGroup;
  startDate: string;
  schedule: { type: string; anchorDate: string };
  tracking: { type: TrackingType; target: number; unit: string };
  lifecycleState: LifecycleState;
  lifecycleHistory: Array<{ id: string; state: LifecycleState; effectiveDate: string }>;
  revisions: Array<{ id: string; effectiveDate: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLogEntry {
  id: string;
  value: number;
  unit: string;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  explicitStatus: ExplicitLogStatus | null;
  entries: HabitLogEntry[];
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface HabitDatabase {
  version: number;
  habits: Habit[];
  logs: HabitLog[];
  preferences: Record<string, unknown>;
  onboarding: Record<string, unknown>;
  legacy: Record<string, unknown>;
  updatedAt: string;
}

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const SCHEDULE_TYPES = [
  'daily',
  'weekdays',
  'timesPerWeek',
  'weekly',
  'interval',
  'monthly',
  'monthlyTarget',
];
const objectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function requireId(value: unknown, label: string, ids: Set<string>) {
  if (typeof value !== 'string' || !ID_PATTERN.test(value) || ids.has(value)) {
    throw new Error(`${label} has an invalid or duplicate stable ID.`);
  }
  ids.add(value);
}

export function assertValidHabitDatabase(value: unknown): asserts value is HabitDatabase {
  if (!objectRecord(value) || value.version !== HABIT_SCHEMA_VERSION) {
    throw new Error('Unsupported habit database schema.');
  }
  if (!Array.isArray(value.habits) || !Array.isArray(value.logs)) {
    throw new Error('Habit database arrays are missing.');
  }

  const habitIds = new Set<string>();
  for (const [index, rawHabit] of value.habits.entries()) {
    if (!objectRecord(rawHabit)) throw new Error(`Habit ${index + 1} is malformed.`);
    requireId(rawHabit.id, `Habit ${index + 1}`, habitIds);
    if (
      typeof rawHabit.name !== 'string' ||
      !rawHabit.name.trim() ||
      !isValidLocalDate(rawHabit.startDate) ||
      typeof rawHabit.timeOfDay !== 'string' ||
      !TIME_GROUPS.includes(rawHabit.timeOfDay) ||
      typeof rawHabit.lifecycleState !== 'string' ||
      !LIFECYCLE_STATES.includes(rawHabit.lifecycleState) ||
      !objectRecord(rawHabit.schedule) ||
      typeof rawHabit.schedule.type !== 'string' ||
      !SCHEDULE_TYPES.includes(rawHabit.schedule.type) ||
      !objectRecord(rawHabit.tracking) ||
      typeof rawHabit.tracking.type !== 'string' ||
      !TRACKING_TYPES.includes(rawHabit.tracking.type) ||
      !Array.isArray(rawHabit.lifecycleHistory) ||
      !Array.isArray(rawHabit.revisions)
    ) {
      throw new Error(`Habit ${index + 1} violates the domain schema.`);
    }
  }

  const logIds = new Set<string>();
  const habitDates = new Set<string>();
  for (const [index, rawLog] of value.logs.entries()) {
    if (!objectRecord(rawLog)) throw new Error(`Log ${index + 1} is malformed.`);
    requireId(rawLog.id, `Log ${index + 1}`, logIds);
    if (
      typeof rawLog.habitId !== 'string' ||
      !habitIds.has(rawLog.habitId) ||
      !isValidLocalDate(rawLog.date) ||
      (rawLog.explicitStatus !== null &&
        (typeof rawLog.explicitStatus !== 'string' ||
          !EXPLICIT_LOG_STATUSES.includes(rawLog.explicitStatus))) ||
      !Array.isArray(rawLog.entries)
    ) {
      throw new Error(`Log ${index + 1} violates the domain schema.`);
    }
    const habitDate = `${rawLog.habitId}:${rawLog.date}`;
    if (habitDates.has(habitDate)) throw new Error('Duplicate habit/date log.');
    habitDates.add(habitDate);

    const entryIds = new Set<string>();
    for (const entry of rawLog.entries) {
      if (!objectRecord(entry)) throw new Error(`Log ${index + 1} has a malformed entry.`);
      requireId(entry.id, `Log ${index + 1} entry`, entryIds);
      if (
        typeof entry.value !== 'number' ||
        !Number.isFinite(entry.value) ||
        entry.value <= 0 ||
        typeof entry.unit !== 'string'
      ) {
        throw new Error(`Log ${index + 1} has an invalid quantitative entry.`);
      }
    }
  }
}

export function migrateHabitDatabase(value: unknown): HabitDatabase {
  assertValidHabitDatabase(value);
  return value;
}
