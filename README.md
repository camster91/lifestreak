# LifeStreak

LifeStreak is a private, local-first habit and routine tracker. It is a general-purpose product for health, learning, planning, family, spiritual, and other personal routines. Spiritual habits are optional templates rather than the app's only identity.

## Primary experience

- **Today** shows habits expected on the selected local date and supports completion, quantitative progress, intentional skip, failure, correction, notes, and undo.
- **Habits** creates and manages binary or measurable routines with flexible schedules, time-of-day groups, lifecycle controls, and editable starter templates.
- **Insights** uses schedule-aware denominators and distinguishes completed, partial, failed, skipped, missed, future, paused, archived, and unscheduled states.
- **Settings** provides explicit reminder permission, private notification copy, export/import, recovery copies, legacy-store inspection, and safe reset controls.
- **Collections** opens the original specialist LifeStreak interface so existing study, service, reading, goal, memory, and other richer records remain accessible.

## Data and privacy

Habit data is stored locally under a separate, versioned key. Existing specialist stores are not deleted or silently reinterpreted. Schedule, target, unit, and lifecycle changes are effective-dated so edits do not rewrite history. Notification permission is requested only from a deliberate Settings action, and habit names are hidden from notification surfaces by default.

Export a JSON backup before clearing browser or installed-app data. The reset workflow creates a local recovery copy first and does not remove specialist Collections data.

## Development

```bash
npm ci
npm run lint
npm test -- --run
npm run build
```

The habit-first architecture, calendar rules, migration policy, representative responsive QA, accessibility checks, and rollback plan are documented in [docs/habit-first-architecture.md](docs/habit-first-architecture.md).

## Implementation status

The habit-first transition is under review in pull request #106 on `codex/lifestreak-habit-first`. The original application shell is retained as `src/LegacyApp.jsx`, and the integration can be rolled back without altering either the new habit database or existing specialist storage.

The pull request must remain unmerged until automated checks can run and representative device, accessibility, import/export, upgrade, and legacy-data QA are complete.

The prioritized, reconciled backlog is maintained in [docs/ISSUE_ROADMAP.md](docs/ISSUE_ROADMAP.md).

## Licence

MIT.
