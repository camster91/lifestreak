export const HABIT_SCHEMA_VERSION = 1;

export const TRACKING_TYPES = [
  'binary',
  'count',
  'duration',
  'distance',
  'volume',
  'weight',
  'energy',
  'custom',
];

export const TIME_GROUPS = ['morning', 'afternoon', 'evening', 'anytime'];
export const LIFECYCLE_STATES = ['active', 'paused', 'archived'];
export const EXPLICIT_LOG_STATUSES = ['completed', 'failed', 'skipped'];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toLocalDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError('Invalid date');
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateKey) {
  if (!DATE_PATTERN.test(dateKey)) throw new TypeError(`Invalid local date: ${dateKey}`);
  const [year, month, day] = dateKey.split('-').map(Number);
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new TypeError(`Invalid local date: ${dateKey}`);
  }
  return parsed;
}

export function isValidLocalDate(dateKey) {
  try {
    parseLocalDate(dateKey);
    return true;
  } catch {
    return false;
  }
}

export function addDays(dateKey, amount) {
  const date = parseLocalDate(dateKey);
  date.setDate(date.getDate() + amount);
  return toLocalDate(date);
}

export function daysBetween(fromDate, toDate) {
  const from = parseLocalDate(fromDate);
  const to = parseLocalDate(toDate);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export function startOfWeek(dateKey, weekStartsOn = 1) {
  const date = parseLocalDate(dateKey);
  const normalizedStart = Math.min(6, Math.max(0, Number(weekStartsOn) || 0));
  const offset = (date.getDay() - normalizedStart + 7) % 7;
  date.setDate(date.getDate() - offset);
  return toLocalDate(date);
}

export function endOfWeek(dateKey, weekStartsOn = 1) {
  return addDays(startOfWeek(dateKey, weekStartsOn), 6);
}

export function startOfMonth(dateKey) {
  parseLocalDate(dateKey);
  return `${dateKey.slice(0, 7)}-01`;
}

export function endOfMonth(dateKey) {
  const date = parseLocalDate(dateKey);
  date.setMonth(date.getMonth() + 1, 0);
  return toLocalDate(date);
}

export function nextMonth(dateKey) {
  const date = parseLocalDate(dateKey);
  date.setDate(1);
  date.setMonth(date.getMonth() + 1);
  return toLocalDate(date);
}

export function eachDate(fromDate, toDate) {
  if (fromDate > toDate) return [];
  const dates = [];
  for (let cursor = fromDate; cursor <= toDate; cursor = addDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

export function configurationForDate(habit, dateKey) {
  const base = {
    schedule: normalizeSchedule(habit.schedule, habit.startDate),
    tracking: normalizeTracking(habit.tracking),
    timeOfDay: habit.timeOfDay || 'anytime',
  };

  return [...(habit.revisions || [])]
    .filter((revision) => revision.effectiveDate <= dateKey)
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
    .reduce(
      (current, revision) => ({
        schedule: revision.schedule
          ? normalizeSchedule(revision.schedule, habit.startDate)
          : current.schedule,
        tracking: revision.tracking ? normalizeTracking(revision.tracking) : current.tracking,
        timeOfDay: revision.timeOfDay || current.timeOfDay,
      }),
      base
    );
}

export function normalizeTracking(tracking = {}) {
  const type = TRACKING_TYPES.includes(tracking.type) ? tracking.type : 'binary';
  const target = type === 'binary' ? 1 : Math.max(0, Number(tracking.target) || 0);
  return {
    type,
    target,
    stretchTarget:
      type === 'binary' || tracking.stretchTarget === '' || tracking.stretchTarget == null
        ? null
        : Math.max(target, Number(tracking.stretchTarget) || target),
    unit: type === 'binary' ? 'completion' : String(tracking.unit || defaultUnit(type)),
    anyAmountCounts: type === 'binary' ? true : Boolean(tracking.anyAmountCounts),
  };
}

export function normalizeSchedule(schedule = {}, fallbackStartDate = toLocalDate()) {
  const type = [
    'daily',
    'weekdays',
    'timesPerWeek',
    'weekly',
    'interval',
    'monthly',
    'monthlyTarget',
  ].includes(schedule.type)
    ? schedule.type
    : 'daily';

  return {
    type,
    weekdays: Array.from(
      new Set((schedule.weekdays || []).map(Number).filter((day) => day >= 0 && day <= 6))
    ).sort(),
    timesPerWeek: Math.min(7, Math.max(1, Number(schedule.timesPerWeek) || 3)),
    monthlyTarget: Math.min(31, Math.max(1, Number(schedule.monthlyTarget) || 3)),
    intervalDays: Math.max(1, Number(schedule.intervalDays) || 2),
    monthlyDays: Array.from(
      new Set((schedule.monthlyDays || []).map(Number).filter((day) => day >= 1 && day <= 31))
    ).sort((a, b) => a - b),
    anchorDate: isValidLocalDate(schedule.anchorDate)
      ? schedule.anchorDate
      : fallbackStartDate || toLocalDate(),
    endDate: isValidLocalDate(schedule.endDate) ? schedule.endDate : null,
  };
}

function defaultUnit(type) {
  switch (type) {
    case 'duration':
      return 'min';
    case 'distance':
      return 'km';
    case 'volume':
      return 'mL';
    case 'weight':
      return 'kg';
    case 'energy':
      return 'kCal';
    case 'count':
      return 'rep';
    default:
      return 'units';
  }
}

export function lifecycleAt(habit, dateKey) {
  if (dateKey < habit.startDate) return 'not-started';
  let state = habit.lifecycleState || 'active';
  const history = [...(habit.lifecycleHistory || [])].sort((a, b) =>
    a.effectiveDate.localeCompare(b.effectiveDate)
  );
  for (const event of history) {
    if (event.effectiveDate > dateKey) break;
    if (LIFECYCLE_STATES.includes(event.state)) state = event.state;
  }
  return state;
}

export function logForDate(logs, habitId, dateKey) {
  return (logs || []).find((log) => log.habitId === habitId && log.date === dateKey) || null;
}

export function dailyResult(habit, log, dateKey) {
  const { tracking } = configurationForDate(habit, dateKey);
  if (!log) return { status: 'unlogged', value: 0, target: tracking.target, tracking };

  const value = (log.entries || []).reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);
  if (log.explicitStatus === 'skipped') {
    return { status: 'skipped', value, target: tracking.target, tracking };
  }
  if (log.explicitStatus === 'failed') {
    return { status: 'failed', value, target: tracking.target, tracking };
  }
  if (tracking.type === 'binary' || log.explicitStatus === 'completed') {
    return { status: 'completed', value: Math.max(1, value), target: tracking.target, tracking };
  }
  if (value <= 0) return { status: 'unlogged', value: 0, target: tracking.target, tracking };
  if (tracking.anyAmountCounts || value >= tracking.target) {
    return { status: 'completed', value, target: tracking.target, tracking };
  }
  return { status: 'partial', value, target: tracking.target, tracking };
}

export function isScheduledOnDate(habit, dateKey, logs = [], weekStartsOn = 1) {
  if (lifecycleAt(habit, dateKey) !== 'active') return false;
  const { schedule } = configurationForDate(habit, dateKey);
  if (schedule.endDate && dateKey > schedule.endDate) return false;
  const date = parseLocalDate(dateKey);

  switch (schedule.type) {
    case 'daily':
      return true;
    case 'weekdays':
      return schedule.weekdays.includes(date.getDay());
    case 'interval':
      return (
        daysBetween(schedule.anchorDate, dateKey) >= 0 &&
        daysBetween(schedule.anchorDate, dateKey) % schedule.intervalDays === 0
      );
    case 'monthly':
      return schedule.monthlyDays.includes(date.getDate());
    case 'timesPerWeek':
    case 'weekly': {
      const weekStart = startOfWeek(dateKey, weekStartsOn);
      const weekEnd = endOfWeek(dateKey, weekStartsOn);
      if (schedule.type === 'weekly' && !schedule.weekdays.includes(date.getDay())) return false;
      const target = schedule.type === 'weekly' ? 1 : schedule.timesPerWeek;
      const completionDates = Array.from(
        new Set(
          (logs || [])
            .filter((log) => {
              if (
                log.habitId !== habit.id ||
                log.date < weekStart ||
                log.date > weekEnd ||
                log.date > dateKey
              ) {
                return false;
              }
              return dailyResult(habit, log, log.date).status === 'completed';
            })
            .map((log) => log.date)
        )
      ).sort();
      const completionIndex = completionDates.indexOf(dateKey);
      if (completionIndex >= 0) return completionIndex < target;
      return completionDates.filter((completedDate) => completedDate < dateKey).length < target;
    }
    case 'monthlyTarget': {
      const month = dateKey.slice(0, 7);
      const completionDates = Array.from(
        new Set(
          (logs || [])
            .filter(
              (log) =>
                log.habitId === habit.id &&
                log.date.startsWith(month) &&
                log.date <= dateKey &&
                dailyResult(habit, log, log.date).status === 'completed'
            )
            .map((log) => log.date)
        )
      ).sort();
      const completionIndex = completionDates.indexOf(dateKey);
      if (completionIndex >= 0) return completionIndex < schedule.monthlyTarget;
      return (
        completionDates.filter((completedDate) => completedDate < dateKey).length <
        schedule.monthlyTarget
      );
    }
    default:
      return false;
  }
}

export function getSchedulePeriodProgress(
  habit,
  logs,
  dateKey,
  { today = toLocalDate(), weekStartsOn = 1 } = {}
) {
  const { schedule } = configurationForDate(habit, dateKey);
  const weekly = schedule.type === 'timesPerWeek' || schedule.type === 'weekly';
  const monthly = schedule.type === 'monthlyTarget';
  if (!weekly && !monthly) return null;

  const periodStart = weekly ? startOfWeek(dateKey, weekStartsOn) : startOfMonth(dateKey);
  const periodEnd = weekly ? endOfWeek(dateKey, weekStartsOn) : endOfMonth(dateKey);
  const target =
    schedule.type === 'weekly' ? 1 : weekly ? schedule.timesPerWeek : schedule.monthlyTarget;
  const completedDates = Array.from(
    new Set(
      (logs || [])
        .filter(
          (log) =>
            log.habitId === habit.id &&
            log.date >= periodStart &&
            log.date <= periodEnd &&
            log.date <= today &&
            dailyResult(habit, log, log.date).status === 'completed'
        )
        .map((log) => log.date)
    )
  );
  const availableDates = eachDate(dateKey > periodStart ? dateKey : periodStart, periodEnd).filter(
    (candidate) =>
      candidate >= dateKey &&
      lifecycleAt(habit, candidate) === 'active' &&
      (!schedule.endDate || candidate <= schedule.endDate) &&
      (schedule.type !== 'weekly' || schedule.weekdays.includes(parseLocalDate(candidate).getDay()))
  );
  return {
    periodStart,
    periodEnd,
    target,
    completed: Math.min(target, completedDates.length),
    remaining: Math.max(0, target - completedDates.length),
    availableDays: availableDates.length,
  };
}

export function getDayState(
  habit,
  logs,
  dateKey,
  { today = toLocalDate(), weekStartsOn = 1 } = {}
) {
  const lifecycle = lifecycleAt(habit, dateKey);
  const log = logForDate(logs, habit.id, dateKey);
  const result = dailyResult(habit, log, dateKey);
  const scheduled = isScheduledOnDate(habit, dateKey, logs, weekStartsOn);

  if (dateKey > today) return { ...result, status: 'future', scheduled, lifecycle };
  if (lifecycle === 'paused') {
    return {
      ...result,
      status: result.status === 'unlogged' ? 'paused' : result.status,
      scheduled: false,
      lifecycle,
    };
  }
  if (lifecycle === 'archived') {
    return {
      ...result,
      status: result.status === 'unlogged' ? 'archived' : result.status,
      scheduled: false,
      lifecycle,
    };
  }
  if (lifecycle === 'not-started') {
    return { ...result, status: 'not-started', scheduled: false, lifecycle };
  }
  if (!scheduled) {
    return {
      ...result,
      status: result.status === 'unlogged' ? 'not-scheduled' : `${result.status}-off-schedule`,
      scheduled: false,
      lifecycle,
    };
  }
  if (result.status === 'unlogged') {
    return { ...result, status: dateKey < today ? 'missed' : 'due', scheduled: true, lifecycle };
  }
  return { ...result, scheduled: true, lifecycle };
}

function evaluateFixedSchedule(habit, logs, fromDate, toDate, weekStartsOn, today) {
  let expected = 0;
  let completed = 0;
  let partial = 0;
  let failed = 0;
  let missed = 0;
  let skipped = 0;
  const streakStates = [];

  for (const dateKey of eachDate(fromDate, toDate)) {
    if (!isScheduledOnDate(habit, dateKey, logs, weekStartsOn)) continue;
    const state = getDayState(habit, logs, dateKey, { today, weekStartsOn });
    if (state.status === 'skipped') {
      skipped += 1;
      streakStates.push({ date: dateKey, status: 'neutral' });
      continue;
    }
    expected += 1;
    if (state.status === 'completed') {
      completed += 1;
      streakStates.push({ date: dateKey, status: 'completed' });
    } else if (state.status === 'partial') {
      partial += 1;
      streakStates.push({ date: dateKey, status: 'broken', reason: 'partially completed' });
    } else if (state.status === 'failed') {
      failed += 1;
      streakStates.push({ date: dateKey, status: 'broken', reason: 'marked not completed' });
    } else if (state.status === 'missed') {
      missed += 1;
      streakStates.push({ date: dateKey, status: 'broken', reason: 'missed' });
    }
  }

  return { expected, completed, partial, failed, missed, skipped, streakStates };
}

function evaluateFlexibleWeeks(habit, logs, fromDate, toDate, weekStartsOn, today) {
  const firstWeek = startOfWeek(fromDate, weekStartsOn);
  const lastWeek = startOfWeek(toDate, weekStartsOn);
  let expected = 0;
  let completed = 0;
  let partial = 0;
  let failed = 0;
  let missed = 0;
  let skipped = 0;
  const streakStates = [];

  for (let week = firstWeek; week <= lastWeek; week = addDays(week, 7)) {
    const weekEnd = endOfWeek(week, weekStartsOn);
    const boundedStart = week < fromDate ? fromDate : week;
    const boundedEnd = weekEnd > toDate ? toDate : weekEnd;
    const activeDays = eachDate(boundedStart, boundedEnd).filter(
      (dateKey) => lifecycleAt(habit, dateKey) === 'active' && dateKey <= today
    );
    if (!activeDays.length) continue;

    const { schedule } = configurationForDate(habit, activeDays[0]);
    const target = schedule.type === 'weekly' ? 1 : schedule.timesPerWeek;
    const results = activeDays.map((dateKey) =>
      dailyResult(habit, logForDate(logs, habit.id, dateKey), dateKey)
    );
    const completions = results.filter((result) => result.status === 'completed').length;
    const allSkipped = results.length > 0 && results.every((result) => result.status === 'skipped');
    const periodFinished = boundedEnd < today || weekEnd < today;

    if (allSkipped) {
      skipped += 1;
      streakStates.push({ date: week, status: 'neutral' });
      continue;
    }

    expected += 1;
    if (completions >= target) {
      completed += 1;
      streakStates.push({ date: week, status: 'completed' });
    } else if (!periodFinished) {
      partial += 1;
    } else {
      missed += 1;
      streakStates.push({ date: week, status: 'broken', reason: 'weekly target missed' });
    }
  }

  return { expected, completed, partial, failed, missed, skipped, streakStates };
}

function evaluateFlexibleMonths(habit, logs, fromDate, toDate, today) {
  let expected = 0;
  let completed = 0;
  let partial = 0;
  let failed = 0;
  let missed = 0;
  let skipped = 0;
  const streakStates = [];

  for (let month = startOfMonth(fromDate); month <= toDate; month = nextMonth(month)) {
    const monthEnd = endOfMonth(month);
    const boundedStart = month < fromDate ? fromDate : month;
    const boundedEnd = monthEnd > toDate ? toDate : monthEnd;
    const activeDays = eachDate(boundedStart, boundedEnd).filter(
      (dateKey) => lifecycleAt(habit, dateKey) === 'active' && dateKey <= today
    );
    if (!activeDays.length) continue;

    const { schedule } = configurationForDate(habit, activeDays[0]);
    const results = activeDays.map((dateKey) =>
      dailyResult(habit, logForDate(logs, habit.id, dateKey), dateKey)
    );
    const completions = results.filter((result) => result.status === 'completed').length;
    const allSkipped = results.length > 0 && results.every((result) => result.status === 'skipped');
    const periodFinished = boundedEnd < today || monthEnd < today;

    if (allSkipped) {
      skipped += 1;
      streakStates.push({ date: month, status: 'neutral' });
      continue;
    }
    expected += 1;
    if (completions >= schedule.monthlyTarget) {
      completed += 1;
      streakStates.push({ date: month, status: 'completed' });
    } else if (!periodFinished) {
      partial += 1;
    } else {
      missed += 1;
      streakStates.push({ date: month, status: 'broken', reason: 'monthly target missed' });
    }
  }

  return { expected, completed, partial, failed, missed, skipped, streakStates };
}

export function explainStreak(stats) {
  const lastDecisive = [...(stats?.streakStates || [])]
    .reverse()
    .find((state) => state.status !== 'neutral');
  if (!lastDecisive) return 'No scheduled result has started this streak yet.';
  if (lastDecisive.status === 'completed') {
    return `Current streak: ${stats.currentStreak}. It grows with each completed scheduled period; intentional skips stay neutral.`;
  }
  return `Current streak: 0. It was reset on ${lastDecisive.date} because that scheduled period was ${lastDecisive.reason || 'not completed'}.`;
}

export function calculateHabitStats(
  habit,
  logs,
  { endDate = toLocalDate(), days = 84, weekStartsOn = 1, today = toLocalDate() } = {}
) {
  const fromDate = addDays(endDate, -(Math.max(1, days) - 1));
  const schedule = configurationForDate(habit, endDate).schedule;
  const metrics = ['timesPerWeek', 'weekly'].includes(schedule.type)
    ? evaluateFlexibleWeeks(habit, logs, fromDate, endDate, weekStartsOn, today)
    : schedule.type === 'monthlyTarget'
      ? evaluateFlexibleMonths(habit, logs, fromDate, endDate, today)
      : evaluateFixedSchedule(habit, logs, fromDate, endDate, weekStartsOn, today);

  let currentStreak = 0;
  let bestStreak = 0;
  let running = 0;
  for (const state of metrics.streakStates) {
    if (state.status === 'completed') {
      running += 1;
      bestStreak = Math.max(bestStreak, running);
    } else if (state.status === 'broken') {
      running = 0;
    }
  }
  for (let index = metrics.streakStates.length - 1; index >= 0; index -= 1) {
    const state = metrics.streakStates[index];
    if (state.status === 'neutral') continue;
    if (state.status === 'completed') currentStreak += 1;
    else break;
  }

  return {
    ...metrics,
    currentStreak,
    bestStreak,
    completionRate: metrics.expected
      ? Math.round((metrics.completed / metrics.expected) * 100)
      : null,
    fromDate,
    endDate,
  };
}

export function compareHabitPeriods(
  habit,
  logs,
  { endDate = toLocalDate(), days = 28, weekStartsOn = 1, today = toLocalDate() } = {}
) {
  const boundedDays = Math.max(1, Number(days) || 28);
  const current = calculateHabitStats(habit, logs, {
    endDate,
    days: boundedDays,
    weekStartsOn,
    today,
  });
  const previous = calculateHabitStats(habit, logs, {
    endDate: addDays(current.fromDate, -1),
    days: boundedDays,
    weekStartsOn,
    today,
  });
  if (
    current.expected < 3 ||
    previous.expected < 3 ||
    current.completionRate == null ||
    previous.completionRate == null
  ) {
    return { status: 'insufficient', current, previous, delta: null };
  }
  return {
    status: 'ready',
    current,
    previous,
    delta: current.completionRate - previous.completionRate,
  };
}

export function summarizeQuantitativePeriod(
  habit,
  logs,
  { endDate = toLocalDate(), days = 28, today = toLocalDate() } = {}
) {
  const fromDate = addDays(endDate, -(Math.max(1, Number(days) || 28) - 1));
  const tracking = configurationForDate(habit, endDate).tracking;
  if (tracking.type === 'binary') return null;
  const results = (logs || [])
    .filter(
      (log) =>
        log.habitId === habit.id &&
        log.date >= fromDate &&
        log.date <= endDate &&
        log.date <= today &&
        lifecycleAt(habit, log.date) === 'active'
    )
    .map((log) => dailyResult(habit, log, log.date));
  return {
    value: results.reduce((total, result) => total + result.value, 0),
    loggedDays: results.filter((result) => result.value > 0).length,
    target: tracking.target,
    unit: tracking.unit,
    fromDate,
    endDate,
  };
}

export function buildWeeklyReview(habits, logs, options = {}) {
  const active = (habits || []).filter(
    (habit) => lifecycleAt(habit, options.endDate || toLocalDate()) === 'active'
  );
  const rows = active.map((habit) => ({
    habit,
    stats: calculateHabitStats(habit, logs, { ...options, days: 28 }),
  }));
  const strong = rows.filter(
    ({ stats }) => stats.completionRate != null && stats.completionRate >= 80
  );
  const adjust = rows.filter(
    ({ stats }) => stats.expected >= 3 && stats.completionRate != null && stats.completionRate < 60
  );
  const insufficient = rows.filter(({ stats }) => stats.expected < 3);
  return { strong, adjust, insufficient };
}

export function starterTemplates(today = toLocalDate()) {
  return [
    {
      templateId: 'bible-reading',
      icon: '📖',
      name: 'Morning Bible reading',
      description: 'Read for at least five focused minutes.',
      category: 'Spiritual',
      timeOfDay: 'morning',
      schedule: { type: 'daily', anchorDate: today },
      tracking: { type: 'duration', target: 5, unit: 'min' },
    },
    {
      templateId: 'personal-prayer',
      icon: '🙏',
      name: 'Personal prayer',
      description: 'Make time for an intentional, unrushed prayer.',
      category: 'Spiritual',
      timeOfDay: 'anytime',
      schedule: { type: 'daily', anchorDate: today },
      tracking: { type: 'binary' },
    },
    {
      templateId: 'move-workout',
      icon: '🏃',
      name: 'Move / workout',
      description: 'Walking, mobility, or a full workout can count.',
      category: 'Health',
      timeOfDay: 'afternoon',
      schedule: { type: 'timesPerWeek', timesPerWeek: 5, anchorDate: today },
      tracking: { type: 'duration', target: 20, unit: 'min' },
    },
    {
      templateId: 'plan-tomorrow',
      icon: '🗓️',
      name: 'Plan tomorrow',
      description: 'Choose the next day’s priorities before winding down.',
      category: 'Planning',
      timeOfDay: 'evening',
      schedule: { type: 'daily', anchorDate: today },
      tracking: { type: 'duration', target: 5, unit: 'min' },
    },
    {
      templateId: 'water',
      icon: '💧',
      name: 'Drink water',
      description: 'Track water without treating health data as medical advice.',
      category: 'Health',
      timeOfDay: 'anytime',
      schedule: { type: 'daily', anchorDate: today },
      tracking: { type: 'volume', target: 2000, unit: 'mL' },
    },
    {
      templateId: 'learn',
      icon: '💡',
      name: 'Learn something',
      description: 'Practise a skill or read material that develops it.',
      category: 'Learning',
      timeOfDay: 'anytime',
      schedule: { type: 'weekdays', weekdays: [1, 2, 3, 4, 5], anchorDate: today },
      tracking: { type: 'duration', target: 15, unit: 'min' },
    },
    {
      templateId: 'home-reset',
      icon: '🏠',
      name: 'Ten-minute home reset',
      description: 'Tidy one useful area without turning it into an all-day project.',
      category: 'Home',
      timeOfDay: 'evening',
      schedule: { type: 'daily', anchorDate: today },
      tracking: { type: 'duration', target: 10, unit: 'min' },
    },
    {
      templateId: 'quiet-minute',
      icon: '🌿',
      name: 'Quiet minute',
      description: 'Pause, breathe, and notice how you are doing.',
      category: 'Wellbeing',
      timeOfDay: 'anytime',
      schedule: { type: 'daily', anchorDate: today },
      tracking: { type: 'duration', target: 1, unit: 'min' },
    },
  ];
}

export function describeSchedule(schedule) {
  const normalized = normalizeSchedule(schedule);
  if (normalized.type === 'daily') return 'Every day';
  if (normalized.type === 'timesPerWeek') {
    return `${normalized.timesPerWeek} times per week`;
  }
  if (normalized.type === 'weekly') {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `Once per week on ${normalized.weekdays.map((day) => names[day]).join(', ')}`;
  }
  if (normalized.type === 'monthlyTarget') return `${normalized.monthlyTarget} times per month`;
  if (normalized.type === 'interval') return `Every ${normalized.intervalDays} days`;
  if (normalized.type === 'monthly') {
    return `Monthly on ${normalized.monthlyDays.join(', ') || 'selected days'}`;
  }
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return normalized.weekdays.map((day) => names[day]).join(', ') || 'Selected weekdays';
}

export function statusLabel(status) {
  const labels = {
    due: 'Due',
    completed: 'Completed',
    partial: 'Partially completed',
    failed: 'Not completed',
    skipped: 'Intentionally skipped',
    missed: 'Missed',
    future: 'Future',
    paused: 'Paused',
    archived: 'Archived',
    'not-started': 'Not started',
    'not-scheduled': 'Not scheduled',
    'completed-off-schedule': 'Completed on an unscheduled day',
    'partial-off-schedule': 'Partial progress on an unscheduled day',
    'failed-off-schedule': 'Marked not completed on an unscheduled day',
    'skipped-off-schedule': 'Skipped on an unscheduled day',
  };
  return labels[status] || status;
}
