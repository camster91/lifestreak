# LifeStreak storage and migration inventory

Last verified: 2026-08-28

This inventory is the data-preservation contract for #101. LifeStreak must not delete, silently reinterpret, or overwrite any listed personal-data store while the habit-first experience is introduced. Raw source values remain recoverable until a record-level migration is verified.

## Disposition vocabulary

- **Primary:** active source of truth for the habit-first product.
- **Preserve as Collection:** keep the original specialist store and expose it through Collections; do not flatten it into a habit completion.
- **Optional explicit migration:** offer a user-reviewed conversion into habits while retaining the source record.
- **Operational:** app preference or diagnostic data, not personal habit history.
- **Session only:** expires with the browser/native web session and is never exported.
- **Quarantine:** preserve the exact raw value for export/review because it cannot be interpreted safely.

## Current persistent keys

| Key | Version/shape | Content | Disposition |
|---|---|---|---|
| `lifestreak-habit-tracker-v1` | Habit schema v1, direct JSON object | Versioned habits, configuration/lifecycle revisions, source log entries, preferences, onboarding state, legacy scan metadata | **Primary.** Never overwrite from a specialist store. Import validates schema and references before replacement or merge. |
| `lifestreak-habit-backup-*` | Direct JSON recovery snapshots | Timestamped habit database copies created before reset/import-sensitive operations | **Primary recovery.** Preserve until the user explicitly removes recovery copies. Exclude from legacy conversion. |
| `ls-progress-storage` | Zustand persist envelope v2 | Daily Text, prayer periods, family worship topics/notes/links, Bible-reading progress/chapters, meeting preparation, weekly reading | **Preserve as Collection.** Bible records use local `yyyy-MM-dd` keys. The v2 migration preserves ambiguous legacy day-of-year records under `legacy-day-of-year:` keys rather than assigning the wrong year. Optional migration may create ordinary habits/logs only after the user selects mappings. Notes, links, chapters, prayer periods, and meeting parts remain in the source store. |
| `ls-progress-settings` | Zustand persist envelope v1 | Notification settings, Bible-reading schedule, theme, non-secret AI configuration | **Operational / preserve.** Never import or export an AI API key. Habit reminders remain governed by habit preferences until settings are deliberately unified. |
| `ls-gamification-storage` | Zustand persist envelope v1 | Points, streak counters, activity counts, unlocked achievements | **Preserve as Collection.** Do not use counters as authoritative completion history and do not migrate them into habit logs. Gamification remains optional pending #69. |
| `ls-goals-storage` | Zustand persist envelope v2 | Goals, projects, project tasks, progress, target dates, categories | **Preserve as Collection.** No automatic habit conversion because project/task meaning is richer than a dated completion. |
| `ls-memories-storage` | Zustand persist envelope v1 | Private dated reflections with created/updated timestamps | **Preserve as Collection.** Never convert reflection text into habit names, notes, telemetry, or notifications. |
| `ls-service-storage` | Zustand persist envelope v1 | Dated service entries with hours, type, notes, weekly/monthly goals, quarantined invalid entries | **Preserve as Collection.** Never reduce quantitative entries or notes to booleans. v1 validates every hydration and preserves invalid records in `quarantinedEntries`. Totals accept validated local `yyyy-MM-dd` dates only and are bounded from the local period start through today; invalid and future records remain stored but do not inflate reports. |
| `ls-reading-storage` | Zustand persist envelope v1 | Reading items, media type, units, progress, start/finish dates, notes, quarantined invalid items | **Preserve as Collection.** v1 validates every hydration and preserves invalid records in `quarantinedItems`. Optional habit linkage may reference an item but must not duplicate or replace its source progress. |
| `ls-error-logs` | JSON array, bounded locally | Error message/stack, component/source location, URL, user agent, timestamp | **Operational.** Local-only diagnostic data; exclude from personal-data migration. Export only through an explicit diagnostics action. Review private-content leakage under #79. |
| `dailyReminderTime` | `{ hour, minute }` JSON | Legacy PWA reminder preference | **Operational legacy.** Preserve until reminder scope is decided in #76, then migrate or retire explicitly. |
| `installPromptDismissed` | ISO timestamp string | PWA install-banner suppression | **Operational.** Safe to preserve; not part of backup/migration counts. |

## Current session-only keys

| Key | Content | Disposition |
|---|---|---|
| `ls-ai-api-key-session` | Optional Ollama API key | **Session only.** Never copy to local storage, backups, migration payloads, logs, or notifications. |
| `lifestreak-reminder:<habit-id>:<date>:<time>` | Open-session reminder deduplication marker | **Session only.** Do not export or migrate. |

## Historical keys found in repository history

| Historical key | Successor | Treatment |
|---|---|---|
| `jw-progress-storage` | `ls-progress-storage` | If the successor key is absent and the payload is valid, offer a non-destructive copy after creating a raw recovery export. If both exist, do not merge automatically; preserve both for review. |
| `jw-progress-settings` | `ls-progress-settings` | Sanitize secrets, validate the settings schema, and offer non-destructive migration only when the successor is absent. |
| `jw-gamification-storage` | `ls-gamification-storage` | Preserve counters/achievements as optional Collections state; never synthesize habit logs from aggregate counts. |
| `jw-goals-storage` | `ls-goals-storage` | Preserve goals/projects/tasks. Apply the checked-in Zustand version migration only after the raw value is backed up. |
| `jw-memories-storage` | `ls-memories-storage` | Preserve exact reflection dates, text, and timestamps. Never expose content outside Collections. |

Repository history also contains symbolic/module tokens such as `progressStore`, `settingsStore`, `gamificationStore`, `goalsStore`, and `memoriesStore`; no evidence currently shows these were browser storage keys. Treat any detected key matching those names as **quarantine** until a real payload proves its schema.

## Malformed and ambiguous values

The following values must never be treated as an empty store:

- invalid JSON;
- the literal string `[object Object]` produced by an unsafe storage adapter;
- a valid JSON value without the expected Zustand `{ state, version }` envelope;
- an unknown version;
- records with invalid dates, duplicate IDs, missing referenced records, or incompatible field types;
- simultaneous historical and successor keys with divergent content.

For these cases, retain the exact key and raw string in a timestamped recovery export, mark the record quarantined, show an actionable explanation, and leave the current store unchanged.

## Migration sequence

1. Enumerate keys without parsing or changing them.
2. Create and verify a raw recovery export containing exact key/value strings.
3. Classify each key using this inventory; unknown matching keys are quarantined.
4. Parse and validate into an isolated candidate object.
5. Present every optional mapping and conflict to the user; default to preservation, not conversion.
6. Write a new versioned candidate without deleting the source key.
7. Rehydrate and compare counts, dates, IDs, notes, links, values, and checksums.
8. Record migration version and outcome so retry is idempotent.
9. Keep source and recovery data until the user explicitly approves cleanup after verification.

## Current verification and remaining work

- All seven Zustand specialist stores now use JSON-aware persistence rather than raw string storage.
- Regression tests verify valid JSON writes for every specialist store and write/rehydrate round trips for service and reading.
- The shared JSON storage adapter never evicts other LifeStreak keys. Failed writes and malformed raw JSON trigger a global recovery banner with retry and download actions; malformed source strings stay untouched at their original key.
- A headless Chromium reload check seeded v1 service and reading histories, opened each Collections route, reloaded it, and confirmed both records remained rendered after hydration.
- Habit storage already fails safely when storage access is blocked and exports detected legacy values without reinterpretation.
- Remaining #101 work: implement historical-key candidate validation and conflict UI; add fixtures for every store/version, malformed and interrupted states; compare record-level results; verify reload, PWA upgrade, Android upgrade, and iOS upgrade; and add explicit cleanup approval.
