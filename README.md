# LifeStreak

A personal habit, service, reading, and goal tracker built with React + Capacitor. Track your daily routines, log service hours, manage reading progress, and build streaks — all in one place.

## Features

- **Home Dashboard** — weekly service + reading snapshots, daily tasks, prayer tracking, Bible reading log, family worship
- **Study** — log study sessions with topic, duration, and notes
- **Service** — log hours by type (field, RV, study, talk, other), weekly/monthly goals with progress bars
- **Reading** — track books, audio, video, articles with progress bars and completion dates
- **Goals** — set and track personal goals with gamification
- **Stats** — streaks, achievements, XP levels
- **Settings** — notifications, theme, data export/backup

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 7 |
| Routing | React Router DOM 7 |
| State | Zustand 5 (persisted to localStorage) |
| Styling | Tailwind CSS 3 + DaisyUI 4 |
| Icons | lucide-react |
| Dates | date-fns |
| Mobile | Capacitor 8 (iOS + Android) |
| PWA | vite-plugin-pwa + Workbox |

## Development

```bash
npm install
npm run dev           # Vite dev server
npm run build         # Production build
npm run mobile:build  # Build + cap sync
npm run mobile:android  # Build + sync + open Android Studio
```

## App Store

- App ID: `com.ashbi.lifestreak`
- All data is user-entered. No scraped content, no external branding, no copyrighted material.
- Privacy Policy in `PRIVACY_POLICY.md`

## License

MIT
