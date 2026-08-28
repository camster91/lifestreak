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

## Persistence and recovery

- Every loaded v1 database passes the runtime domain validator before it becomes app state. Invalid databases remain untouched in local storage and open an error state instead of being partially loaded.
- Every mutation serializes the whole candidate, writes it synchronously, and reads it back byte-for-byte before publishing success in memory. Exceptions and silently dropped writes restore the previous snapshot and report `Nothing was saved`.
- Import validation enforces stable-ID uniqueness, referential integrity, one log per habit/date, bounded record counts, valid local dates, safe display fields, supported statuses/types, and positive finite quantitative values.
- The v1 migration entrypoint is deterministic and idempotent. Unsupported versions are preserved and refused until an explicit migration is implemented.
