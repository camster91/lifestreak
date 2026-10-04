# LifeStreak

A private, local-first habit and routine tracker for the web, iOS and Android.

## What it does

LifeStreak tracks personal routines of any kind: health, learning, planning, family, spiritual and more. Spiritual habits are offered as optional starter templates rather than the app's only focus. Everything is stored on the device; there is no account and no cloud sync. The web app is an installable PWA and the same build is packaged for iOS and Android with Capacitor.

## Features

- **Today**: habits due on the selected local date, with completion, quantitative progress, intentional skip, failure, correction, notes and undo
- **Habits**: binary or measurable routines with flexible schedules, time-of-day groups, pause/archive lifecycle and editable starter templates
- **Insights**: schedule-aware stats that separate completed, partial, failed, skipped, missed, future, paused, archived and unscheduled days
- **Settings**: opt-in reminders (permission requested only from an explicit action, habit names hidden from notifications by default), JSON export/import, recovery copies and a safe reset
- **Effective-dated edits**: changing a schedule, target, unit or lifecycle state does not rewrite past history
- **Collections**: the original LifeStreak interface (study, reading, service, goals, reflections) stays available so older records are never lost or silently reinterpreted
- **Offline-ready PWA** with a Workbox service worker and update prompt

## Tech stack

| Layer | Technology |
|---|---|
| UI | React 19, React Router 7 |
| Build | Vite 7, TypeScript (type-checked domain and stores) |
| State | Zustand 5 and versioned `localStorage` stores |
| Styling | Tailwind CSS 4, DaisyUI 5, lucide-react icons |
| Dates | date-fns |
| Mobile | Capacitor 8 (iOS + Android), local notifications, haptics |
| PWA | vite-plugin-pwa, Workbox |
| Testing | Vitest, Testing Library, Playwright with axe-core |
| Dev API | Small Express server for local development |
| Container | Multi-stage Docker build (Node builder, nginx runtime) |

## Getting started

Requires Node 22 and npm 11 (see `.nvmrc` and `package.json` engines).

```bash
git clone https://github.com/camster91/lifestreak.git
cd lifestreak
npm ci
npm run dev        # Vite dev server only
npm start          # Vite plus the local Express API (port 3009)
```

### Scripts

| Command | What it does |
|---|---|
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run format:check` | Prettier check |
| `npm run design-system:check` | Checks UI code against the design-system rules |
| `npm run permissions:check` | Checks declared native permissions |
| `npm run supply-chain:check` | Dependency and lockfile policy checks |

### Mobile

```bash
npm run mobile:ios           # build, sync and open Xcode
npm run mobile:android       # build, sync and open Android Studio
npm run android:build:debug  # debug APK via Gradle
```

See [MOBILE_BUILD_GUIDE.md](MOBILE_BUILD_GUIDE.md) for native build details.

## Testing

```bash
npm test               # Vitest unit and component tests
npm run test:coverage  # with v8 coverage
npm run ui:check       # Playwright + axe accessibility and visual checks across viewports
```

Tests cover the habit engine (including time-zone edge cases), domain rules, storage, legacy-data migration, reminders and UI guards.

## Project structure

```
src/
├── App.jsx            # Chooses the habit tracker or the legacy Collections view
├── habitTracker/      # Habit engine, domain model, store, reminders, migration, UI
├── LegacyApp.jsx      # Original specialist interface (Collections)
├── pages/             # Legacy pages: study, reading, service, goals, stats, settings
├── stores/            # Zustand stores for legacy collections
└── sw.js              # Service worker
docs/                  # Architecture, design system, privacy and QA notes
scripts/               # Project checks and build helpers
android/  ios/         # Capacitor native projects
```

## Documentation

- [Habit-first architecture](docs/habit-first-architecture.md): calendar rules, migration policy, QA and rollback plan
- [Habit domain](docs/habit-domain.md)
- [Design system](docs/design-system.md)
- [Permissions and data flows](docs/permissions-and-data-flows.md)
- [Privacy policy](PRIVACY_POLICY.md)

## Data and privacy

Habit data is stored locally under a separate, versioned key. Export a JSON backup before clearing browser or app data. The reset flow makes a local recovery copy first and does not remove Collections data.

## License

MIT, see [LICENSE](LICENSE).
