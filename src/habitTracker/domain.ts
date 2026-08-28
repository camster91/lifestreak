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

function isTimestamp(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value));
}

function isIntegerArray(value: unknown, minimum: number, maximum: number) {
  return (
    Array.isArray(value) &&
    new Set(value).size === value.length &&
    value.every(
      (item) => Number.isInteger(item) && Number(item) >= minimum && Number(item) <= maximum
    )
  );
}

function assertSchedule(value: unknown, startDate: string, label: string) {
  if (!objectRecord(value) || !SCHEDULE_TYPES.includes(String(value.type))) {
    throw new Error(`${label} has an invalid schedule.`);
  }
  if (!isValidLocalDate(value.anchorDate)) {
    throw new Error(`${label} has an invalid schedule anchor.`);
  }
  if (
    value.endDate != null &&
    (!isValidLocalDate(value.endDate) || String(value.endDate) < startDate)
  ) {
    throw new Error(`${label} has an invalid schedule end date.`);
  }
  if (
    ['weekdays', 'weekly'].includes(String(value.type)) &&
    (!isIntegerArray(value.weekdays, 0, 6) || (value.weekdays as unknown[]).length === 0)
  ) {
    throw new Error(`${label} has invalid scheduled weekdays.`);
  }
  if (
    value.type === 'timesPerWeek' &&
    (!Number.isInteger(value.timesPerWeek) ||
      Number(value.timesPerWeek) < 1 ||
      Number(value.timesPerWeek) > 7)
  ) {
    throw new Error(`${label} has an invalid weekly target.`);
  }
  if (
    value.type === 'interval' &&
    (!Number.isInteger(value.intervalDays) || Number(value.intervalDays) < 1)
  ) {
    throw new Error(`${label} has an invalid interval.`);
  }
  if (
    value.type === 'monthly' &&
    (!isIntegerArray(value.monthlyDays, 1, 31) || (value.monthlyDays as unknown[]).length === 0)
  ) {
    throw new Error(`${label} has invalid monthly days.`);
  }
  if (
    value.type === 'monthlyTarget' &&
    (!Number.isInteger(value.monthlyTarget) ||
      Number(value.monthlyTarget) < 1 ||
      Number(value.monthlyTarget) > 31)
  ) {
    throw new Error(`${label} has an invalid monthly target.`);
  }
}

function assertTracking(value: unknown, label: string) {
  if (
    !objectRecord(value) ||
    typeof value.type !== 'string' ||
    !TRACKING_TYPES.includes(value.type) ||
    typeof value.target !== 'number' ||
    !Number.isFinite(value.target) ||
    value.target < 0 ||
    (value.type !== 'binary' && !value.anyAmountCounts && value.target <= 0) ||
    typeof value.unit !== 'string' ||
    !value.unit.trim()
  ) {
    throw new Error(`${label} has invalid tracking.`);
  }
  if (
    value.stretchTarget != null &&
    (typeof value.stretchTarget !== 'number' ||
      !Number.isFinite(value.stretchTarget) ||
      value.stretchTarget < value.target)
  ) {
    throw new Error(`${label} has an invalid stretch target.`);
  }
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
      !Array.isArray(rawHabit.lifecycleHistory) ||
      !Array.isArray(rawHabit.revisions) ||
      !isTimestamp(rawHabit.createdAt) ||
      !isTimestamp(rawHabit.updatedAt)
    ) {
      throw new Error(`Habit ${index + 1} violates the domain schema.`);
    }
    const habitStartDate = String(rawHabit.startDate);
    assertSchedule(rawHabit.schedule, habitStartDate, `Habit ${index + 1}`);
    assertTracking(rawHabit.tracking, `Habit ${index + 1}`);

    const lifecycleIds = new Set<string>();
    const lifecycleDates = new Set<string>();
    for (const event of rawHabit.lifecycleHistory) {
      if (!objectRecord(event))
        throw new Error(`Habit ${index + 1} has malformed lifecycle history.`);
      requireId(event.id, `Habit ${index + 1} lifecycle event`, lifecycleIds);
      if (
        typeof event.state !== 'string' ||
        !LIFECYCLE_STATES.includes(event.state) ||
        !isValidLocalDate(event.effectiveDate) ||
        lifecycleDates.has(String(event.effectiveDate)) ||
        !isTimestamp(event.createdAt)
      ) {
        throw new Error(`Habit ${index + 1} has invalid lifecycle history.`);
      }
      lifecycleDates.add(String(event.effectiveDate));
    }

    const revisionIds = new Set<string>();
    const revisionDates = new Set<string>();
    for (const revision of rawHabit.revisions) {
      if (!objectRecord(revision)) throw new Error(`Habit ${index + 1} has a malformed revision.`);
      requireId(revision.id, `Habit ${index + 1} revision`, revisionIds);
      if (
        !isValidLocalDate(revision.effectiveDate) ||
        revisionDates.has(String(revision.effectiveDate)) ||
        !isTimestamp(revision.createdAt)
      ) {
        throw new Error(`Habit ${index + 1} has an invalid revision.`);
      }
      revisionDates.add(String(revision.effectiveDate));
      assertSchedule(revision.schedule, habitStartDate, `Habit ${index + 1} revision`);
      assertTracking(revision.tracking, `Habit ${index + 1} revision`);
      if (typeof revision.timeOfDay !== 'string' || !TIME_GROUPS.includes(revision.timeOfDay)) {
        throw new Error(`Habit ${index + 1} revision has an invalid time group.`);
      }
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
    if (
      typeof rawLog.note !== 'string' ||
      !isTimestamp(rawLog.createdAt) ||
      !isTimestamp(rawLog.updatedAt)
    ) {
      throw new Error(`Log ${index + 1} has invalid metadata.`);
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
        typeof entry.unit !== 'string' ||
        !entry.unit.trim() ||
        !isTimestamp(entry.createdAt)
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
