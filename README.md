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

Use the exact Node/npm versions declared by the repository, then:

```bash
npm ci
npm run lint
npm test -- --run
npm run build
```

Coding agents should read [AGENTS.md](AGENTS.md) first for the authoritative execution, verification, privacy, production, and handoff contract. The habit-first architecture, calendar rules, migration policy, representative responsive QA, accessibility checks, and data-safety constraints are documented in [docs/habit-first-architecture.md](docs/habit-first-architecture.md).

## Current status

The habit-first transition from pull request #106 merged to `main` on September 1, 2026. Current product truth, release evidence, unresolved external/manual gates, and production status are maintained in [docs/product-control.md](docs/product-control.md) plus live GitHub issues and pull requests.

The independent web/PWA has been released, while native/store release, real-device evidence, customer validation, and other launch gates remain separate. Do not infer those outcomes from the merged source or a successful web build.

The prioritized, reconciled backlog is maintained in [docs/ISSUE_ROADMAP.md](docs/ISSUE_ROADMAP.md).
The product charter, evidence register, market position, metrics, and launch risks are maintained in [docs/product-control.md](docs/product-control.md).
Canonical product, bundle, version, origin, and release identity values are maintained in [docs/product-identity.md](docs/product-identity.md).

## Licence

MIT.
