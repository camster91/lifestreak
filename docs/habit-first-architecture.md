# LifeStreak habit-first architecture

## Product decision

LifeStreak is a general-purpose, local-first habit and routine tracker. Spiritual routines are supported as optional habits and templates, while richer spiritual, service, reading, goal, and memory records remain available through **Collections**. JW Companion remains a separate specialist product.

The primary information architecture is:

1. **Today** — complete, quantify, skip, fail, clear, correct, and review habits due on a local calendar date.
2. **Habits** — create, edit, reorder, pause, archive, restore, delete, and add optional templates.
3. **Insights** — schedule-aware rates, streaks, recent history, and a non-judgemental weekly review.
4. **Settings** — reminder privacy, backup, import, recovery, legacy-store inspection, and reset controls.

## Core records

### Habit

A habit has a stable ID, user-defined name, description, category, visual colour, start date, time-of-day group, schedule, tracking definition, optional reminder, order, and lifecycle history.

Schedules support:

- every day;
- selected weekdays;
- a target number of times per week;
- every N days from a local-date anchor; and
- selected days of the month.

Tracking supports binary completion and measurable count, duration, distance, volume, weight, energy, or custom units. A measurable habit can use a minimum target, optional stretch target, or “any amount counts”.

### Habit log

A log is keyed by a stable habit ID and full local date (`YYYY-MM-DD`). It contains an explicit status when the user chooses completed, failed, or skipped; zero or more quantitative source entries; and an optional private note. Daily totals, partial progress, completion, streaks, and insight metrics are derived rather than stored as competing counters.

### Historical revisions

Schedule, target, unit, and time-of-day changes are stored as effective-dated revisions. A record from before an edit resolves against the rules active on that date, so changing a 5-minute target to 20 minutes does not rewrite history.

### Lifecycle history

Pause, resume, and archive actions are effective-dated. Prior active dates remain active. A pause is not converted into missed days, and restoring an archived habit does not erase its history.

## Calendar contract

- Daily records use local calendar dates, never UTC slices.
- Future dates are never due and cannot satisfy current periods.
- Unscheduled dates do not enter completion-rate denominators.
- Intentional skips remain neutral and do not count as failures.
- Activity on an unscheduled date is preserved but does not inflate expected completion rates or scheduled streaks.
- Flexible weekly targets are evaluated as periods rather than seven independent obligations.
- Week-start preference is explicit.
- Date arithmetic is performed at local noon to avoid daylight-saving midnight transitions.

## Persistence and recovery

The habit database uses a versioned local-storage key. Every mutation is prepared in memory, persisted, and only then published to the interface. A failed write leaves the previous state active and displays a persistent error instead of a false success.

The user can:

- undo the latest reversible operation during the current session;
- create a local recovery copy;
- export a complete JSON backup;
- restore or merge a compatible backup;
- create a recovery copy before import or reset; and
- reset the habit database without deleting specialist Collections data.

## Legacy-data policy

The habit-first release does not silently reinterpret existing Daily Text, prayer, Bible-reading, family-worship, meeting, service, reading, goal, project, memory, or gamification records.

The original application shell is copied to `src/LegacyApp.jsx` before `src/App.jsx` is replaced. The **Collections** action reloads the original shell in an isolated legacy mode, keeping the original specialist UI and stores available. Settings can scan for likely legacy storage keys and export their raw values exactly. Ambiguous or yearless data is preserved rather than guessed.

A future migration may map records only where the transformation is lossless and explicitly approved. Rich service entries must never be reduced to a boolean completion.

## Reminder privacy

Notification permission is requested only from an explicit Settings action. Startup, rendering, and rescheduling do not trigger a permission prompt. Habit names are hidden from notification surfaces by default. The web implementation schedules reminders only while LifeStreak is open; native background delivery remains a platform-specific responsibility and must follow the same permission and privacy contract.

## Accessibility contract

- Semantic headings, landmarks, fieldsets, labels, progress elements, status text, and modal roles are required.
- Every interactive target is approximately 44 by 44 CSS pixels or larger.
- Status is communicated with text and not colour alone.
- Keyboard focus is visible; dialogs focus the first control, close with Escape, and restore focus.
- Reduced-motion, forced-colour, dark-theme, 200% zoom, and virtual-keyboard layouts are supported.
- The primary workflow remains usable from 320 CSS pixels through tablet and desktop widths.

## Representative QA

### Functional

- Create minimal binary, measurable, and custom-unit habits.
- Add each optional template independently and as a group.
- Exercise every schedule at local-date, week, month, leap-day, December/January, and daylight-saving boundaries.
- Complete, partially complete, fail, skip, clear, undo, backdate, add multiple values, remove a value, and save a note.
- Edit a target, unit, schedule, and time group; confirm earlier dates retain earlier rules.
- Pause, resume, archive, restore, reorder, and permanently delete with recovery.
- Export, merge, replace, reset, reload, and restore.
- Enter Collections and return to the habit tracker without altering specialist records.

### Responsive

- 320 × 568 phone
- representative Android and iPhone widths
- portrait and landscape tablet
- 1366 × 768 laptop
- wide desktop
- every representative viewport at 200% browser zoom

Verify no clipped controls, inaccessible dialog actions, horizontal page overflow, obscured input under the virtual keyboard, or bottom-navigation overlap.

### Accessibility

Test keyboard-only use, VoiceOver, TalkBack, high contrast/forced colours, reduced motion, labels, announcements, focus order, dialog focus return, status text, touch target size, and empty/error/offline states.

### Reliability

Simulate storage read, write, quota, parse, interrupted import, malformed backup, duplicate record, and reset failures. No failed operation may appear successful, and the preceding recoverable state must remain available.

## Rollback

The habit-first transition from pull request #106 merged to `main` on September 1, 2026. The former branch-only rollback instruction is therefore historical and must not be treated as the current production rollback procedure.

Current rollback planning must start from the exact released source/artifact and production evidence recorded in `docs/product-control.md` and current release/operations material. Preserve the separate versioned habit store and existing specialist Collections stores across any rollback or upgrade path; neither data set may be silently deleted or reinterpreted.

If an application change alters storage schema, native packaging, release identity, or upgrade compatibility, document and verify the forward/rollback compatibility for that exact change before release. Do not claim rollback readiness unless the applicable previous artifact/route backup and data compatibility have actually been verified.
