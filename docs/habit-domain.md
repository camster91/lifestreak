# LifeStreak habit domain contract

The canonical runtime and TypeScript contract lives in `src/habitTracker/domain.ts`; schedule and derived-state rules live in `src/habitTracker/engine.js`. The persisted database schema is version 1.

## Source records

- A **habit** has a stable ID, identity and category, local start date, schedule, tracking type/target/unit, time group, reminder preference, ordering, timestamps, lifecycle history, and dated configuration revisions.
- A **habit log** has a stable ID, stable `habitId`, local `yyyy-MM-dd` date, optional explicit completed/failed/skipped status, additive quantitative entries, note, and timestamps.
- Aggregate counters are never authoritative. Streaks, completion rates, daily states, and weekly reviews are derived from schedules, revisions, lifecycle history, and logs.
- Specialist Collections may reference stable habit/log IDs, but the core domain contains no spiritual or JW-specific fields.

## Distinct day states

`getDayState` distinguishes future, not-started, paused, archived, unscheduled, unlogged, partial, completed, failed, and skipped. Clearing removes the source log and returns the day to its derived unlogged or unscheduled state; it is not stored as a false completion.

## Calendar and history rules

- Stored day keys are local calendar dates, never UTC timestamps truncated to a date.
- Date arithmetic constructs local noon values to avoid DST-midnight gaps and always serializes back to `yyyy-MM-dd`.
- A configuration revision takes effect on its `effectiveDate`; it does not rewrite earlier schedule or target expectations.
- Lifecycle events are also effective-dated, preserving historical active/paused/archived expectations.
- At most one log may exist for a habit/date pair. Corrections update that stable log; quantitative additions retain stable entry IDs.
- New logs cannot be created for malformed or future dates, before a habit starts, or while its lifecycle is paused/archived. Existing historical records can still be corrected or cleared, and an active user may deliberately record an off-schedule result, which remains explicitly labelled off-schedule.
- Quantitative entries use the unit from the effective dated tracking configuration; a caller cannot attach a conflicting unit and silently change historical meaning.

## Schedule and streak language

- Supported schedules are every day, selected weekdays, a target number per week, once per week within selected weekdays, every N days, selected month days, and a target number per month. An optional end date stops new expectations.
- Morning, afternoon, evening, and anytime are optional presentation groups. Their persisted display order is user-reorderable and changes presentation only, never due-state or history.
- Flexible weekly/monthly schedules expose the target, completions, remaining target, and remaining available dates from the same pure engine used by Today and stats. Future-dated logs never satisfy the current period.
- `Current streak` counts consecutive completed scheduled periods ending at the latest decisive result. `Best streak` is the longest such run in the selected history.
- Intentional skips are neutral: they neither increase nor break a streak and are excluded from the expected denominator. Paused, archived, future, and unscheduled dates are also neutral.
- A partial, failed, or missed scheduled period breaks the current streak. Insights state the exact date and reason for the latest break.
- Backdated corrections immediately recompute streaks and completion rates from source logs. Prospective schedule revisions preserve earlier expectations.
- Insights partition a selected range at every effective-dated schedule or tracking revision. Each schedule segment uses its own daily, weekly, or monthly denominator. Quantitative source values are totalled only inside a segment with one tracking type, unit, and target; incompatible units and historical targets are displayed as separate labelled metrics and are never added together.
- The automated timezone matrix runs the same leap-day, DST-transition, year-boundary, local-date, and completion fixture under UTC−12, UTC+14, America/Toronto, and Europe/Berlin.

## Persistence and recovery

- Every loaded v1 database passes the runtime domain validator before it becomes app state. Validation includes schedule parameters, tracking targets/units, lifecycle and revision IDs/effective dates/configuration/timestamps, habit/log/entry timestamps, log notes, quantitative values, referential integrity, and uniqueness of history dates. Invalid databases remain untouched in local storage and open an error state instead of being partially loaded.
- Every mutation serializes the whole candidate, writes it synchronously, and reads it back byte-for-byte before publishing success in memory. Exceptions and silently dropped writes restore the previous snapshot and report `Nothing was saved`.
- Import validation enforces stable-ID uniqueness, referential integrity, one log per habit/date, bounded record counts, valid local dates, safe display fields, supported statuses/types, and positive finite quantitative values.
- The v1 migration entrypoint is deterministic and idempotent. Unsupported versions are preserved and refused until an explicit migration is implemented.
