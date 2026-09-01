# LifeStreak — App Store Submission Guide

> Release metadata in this document is preparatory. It must be reconciled with the signed native builds, current store-console requirements, physical-device QA, and the hosted privacy policy before submission.

## App details

- **Name:** LifeStreak
- **Bundle ID:** `com.ashbi.lifestreak`
- **Repository version:** 4.0.0
- **Primary category:** Lifestyle / Productivity
- **Age rating target:** Appropriate for a general personal habit tracker, subject to the completed store questionnaire
- **Product model:** Private, local-first habit and routine tracking with optional specialist Collections

## Short description

Private habit and routine tracking with flexible schedules and useful insights.

## Full description

LifeStreak helps you build practical routines without requiring an account or sending your personal tracking history to the developer.

Create simple yes/no habits or measurable routines for health, learning, planning, family, spiritual, and other personal goals. Choose daily, selected-weekday, times-per-week, interval, or monthly schedules, then organise habits by morning, afternoon, evening, or anytime.

### Features

- Focused Today view for habits expected on the selected date
- Binary and measurable habits with partial progress
- Counts, duration, distance, volume, weight, energy, and custom units
- Flexible schedules, reminders, pauses, archives, corrections, notes, and undo
- Schedule-aware completion rates, streaks, calendar history, and weekly review
- Optional editable starter templates, including spiritual routines
- Original study, service, reading, goal, and other richer records preserved in Collections
- Local JSON export, validated import, and recovery copies
- Offline-first use with no account required
- Accessible responsive interface with light and dark theme support

LifeStreak is a personal tracking tool. It is not a medical device and does not provide medical advice or emergency monitoring.

## Privacy and claim requirements

Store copy and screenshots must accurately state that:

- General habit data is stored locally in a separate, versioned database.
- Existing specialist Collections stores are preserved and are not silently converted or uploaded.
- Notification permission is requested only after a deliberate Settings action.
- Habit names are hidden from notification text by default.
- Browser reminders operate while the app is open; native background reminder claims require platform verification.
- Export and import occur only after a user action.
- No cloud synchronisation, medical outcomes, automatic migration, or cross-device restore may be claimed unless separately implemented and verified.

## Android release preparation

### Prerequisites

1. Active Google Play Console access
2. A production release keystore supplied and stored outside the repository
3. Signing credentials supplied through the authorised release process
4. Passing signed Android App Bundle build
5. Physical-device QA on representative supported Android versions

### Build sequence

```bash
npm ci
npm run lint
npm test -- --run
npm run build
npx cap sync android
npx cap open android
```

Generate a signed Android App Bundle in Android Studio with the separately managed release keystore. Keep the keystore and signing passwords in an approved secret manager; never commit them.

### Required evidence

- Signed release AAB builds successfully
- Fresh install and upgrade from an existing LifeStreak version
- Habit and Collections data remain accessible after upgrade
- Notifications request permission only after the user action
- Offline launch and tracking
- Export/import and reset recovery
- TalkBack, font scaling, zoom, contrast, touch targets, and keyboard behaviour
- Phone and tablet screenshots generated from the release candidate

## iOS release preparation

### Prerequisites

1. Active Apple Developer and App Store Connect access
2. macOS with a supported Xcode version
3. Valid certificates, identifiers, and provisioning
4. Passing archive and App Store validation
5. TestFlight and physical-device QA

### Build sequence

```bash
npm ci
npm run lint
npm test -- --run
npm run build
npx cap sync ios
npx cap open ios
```

Archive and validate the release candidate in Xcode. The repository cannot establish App Store readiness without the signed archive, App Store validation, and target-device evidence.

### Required evidence

- Archive and validation succeed
- Fresh install and upgrade preserve habit and Collections data
- VoiceOver, Dynamic Type/font scaling, zoom, contrast, touch targets, and external keyboard behaviour
- Notification permission and lock-screen privacy
- Offline launch and tracking
- Export/import and reset recovery
- iPhone and iPad screenshots generated from the release candidate

## Store assets

Final assets should show the actual general-purpose product rather than a JW-only experience:

1. Today with mixed general habits
2. Habit creation and flexible schedules
3. Quantitative progress
4. Schedule-aware Insights and weekly review
5. Settings, notification privacy, and backup/recovery
6. Optional Collections without presenting them as mandatory

Required dimensions and asset counts must be verified in the current store consoles before production.

## Privacy policy

The repository policy is `PRIVACY_POLICY.md`. The proposed hosted location is:

`https://lifestreak.ashbi.ca/privacy.html`

Before submission, confirm that the hosted page is reachable, matches the repository policy, uses HTTPS without warnings, and reflects the release candidate.

## Release decision

Do not submit, publish, or replace a production listing until all automated gates, signed native builds, representative device/accessibility QA, upgrade/data-preservation testing, screenshots, privacy verification, and rollback planning are complete and explicitly approved.
