# LifeStreak — App Store Release Checklist

> LifeStreak is an active, general-purpose habit tracker. Spiritual routines remain optional templates and specialist Collections. This checklist is a release gate, not evidence that a store submission or production deployment has occurred.

## Current release status

| Area | Status | Evidence or blocker |
|---|---|---|
| Habit-first source | In review | Draft PR #106 on `codex/lifestreak-habit-first` |
| Automated lint, tests, and web build | Blocked | GitHub Actions jobs cannot start because of an account billing or spending-limit restriction |
| Android signed release | Blocked | Production keystore and signed release verification required |
| iOS archive | Blocked | macOS/Xcode archive and App Store validation required |
| Representative device QA | Not verified | Physical Android, iPhone, and tablet evidence required |
| Store submission | Not started | Requires explicit release approval after all gates pass |

## Product and data integrity

- [x] Define LifeStreak as a general-purpose habit and routine tracker.
- [x] Make Today, Habits, Insights, and Settings the primary experience.
- [x] Preserve the original specialist interface under Collections.
- [x] Store the general habit database separately from existing specialist stores.
- [x] Add versioned habits and logs with stable IDs.
- [x] Add daily, weekday, times-per-week, interval, and monthly schedules.
- [x] Add binary and quantitative progress, partial completion, corrections, notes, and undo.
- [x] Add lifecycle and configuration history so prospective edits do not rewrite earlier results.
- [x] Add bounded, validated JSON import and local recovery copies.
- [x] Correct the weekly-target date that completes the target so it remains scheduled.
- [ ] Verify real existing LifeStreak data on upgrade, reload, restart, export, import, reset, and rollback.
- [ ] Verify no existing specialist record is deleted, duplicated, misdated, or silently converted.
- [ ] Decide and document the treatment of every historical storage key and unsupported legacy shape.

## Automated quality gates

- [ ] Resolve the GitHub Actions billing or spending-limit restriction.
- [ ] Run `npm ci` with Node 22.
- [ ] Run `npm run lint` successfully.
- [ ] Run `npm test -- --run` successfully.
- [ ] Run `npm run build` successfully.
- [ ] Run Android debug build and Capacitor sync successfully.
- [ ] Run signed Android App Bundle build successfully.
- [ ] Run iOS archive and App Store validation successfully.
- [ ] Confirm generated service worker, manifest, icons, and offline assets match the habit-first product.
- [ ] Confirm no high- or critical-severity dependency or source-code security finding remains unresolved.

## Functional QA

- [ ] First run with no habits: create one basic daily habit in under one minute.
- [ ] Add, customise, and remove each starter template.
- [ ] Create binary, count, duration, distance, volume, weight, energy, and custom-unit habits.
- [ ] Test daily, selected weekdays, times per week, every N days, and monthly schedules.
- [ ] Test morning, afternoon, evening, and anytime grouping and reordering.
- [ ] Complete, partially complete, fail, intentionally skip, clear, backdate, correct, and undo.
- [ ] Confirm duplicate taps do not create duplicate logs.
- [ ] Confirm future, unscheduled, paused, archived, and not-started dates remain neutral where specified.
- [ ] Confirm schedule, target, unit, and time-group edits preserve prior history.
- [ ] Confirm reminders use generic text by default and names only after opt-in.
- [ ] Confirm browser reminder claims are limited to while the app is open.
- [ ] Confirm import rejects unsupported schema, invalid dates, unknown habit references, duplicate IDs, duplicate habit/date logs, invalid values, and oversized files.
- [ ] Confirm replace import and reset abort safely when a recovery copy cannot be created.
- [ ] Confirm Collections opens and returns to the habit tracker without losing either data set.

## Responsive QA

- [ ] 320px narrow phone portrait
- [ ] Representative Android phone portrait and landscape
- [ ] Representative iPhone portrait and landscape
- [ ] Small tablet portrait and landscape
- [ ] Large tablet portrait and landscape
- [ ] Laptop viewport
- [ ] Wide desktop viewport
- [ ] Notched-device safe areas
- [ ] On-screen keyboard with habit form and note editor
- [ ] 200% browser zoom without clipped content or blocked controls
- [ ] Large operating-system font settings without lost actions

## Accessibility QA

- [x] Remove the viewport rule that disabled user zoom.
- [x] Provide a skip link, visible focus indicators, semantic headings, labelled controls, and text status labels.
- [ ] Trap focus inside dialogs and restore focus after close.
- [ ] Warn before discarding unsaved habit-form changes.
- [ ] Verify full keyboard navigation, including menus, date controls, dialogs, and history.
- [ ] Verify VoiceOver on iPhone and iPad.
- [ ] Verify TalkBack on Android.
- [ ] Verify reduced motion.
- [ ] Verify forced-colour/high-contrast mode.
- [ ] Verify status and charts do not rely on colour alone.
- [ ] Verify every essential touch target is at least 44 by 44 CSS pixels.

## Privacy and security QA

- [x] Update repository privacy policy for the separate habit database and Collections stores.
- [x] Keep habit names hidden from notification surfaces by default.
- [x] Request notification permission only from a deliberate Settings action.
- [x] Validate and bound supported imported data before persistence.
- [ ] Verify the hosted privacy-policy page matches `PRIVACY_POLICY.md` over valid HTTPS.
- [ ] Verify platform privacy disclosures match the release candidate.
- [ ] Verify exported files contain only the records and metadata described to the user.
- [ ] Verify sensitive habit names and notes do not appear in logs, analytics, crash reports, or generic notifications.
- [ ] Verify Content Security Policy and production hosting headers.
- [ ] Verify secrets, signing files, passwords, and service credentials are absent from Git history and built web assets.

## Android release

- [ ] Confirm active Play Console access and authorised release owner.
- [ ] Supply and securely back up the production keystore outside Git.
- [ ] Confirm release signing fails closed when credentials are missing.
- [ ] Generate signed AAB from the reviewed commit.
- [ ] Test fresh install and upgrade from the existing production version.
- [ ] Test representative supported Android versions and device sizes.
- [ ] Verify notification permission and background scheduling on supported Android versions.
- [ ] Verify deep links, share target, offline launch, app updates, and rollback.
- [ ] Complete Play content rating, data-safety, target-audience, category, and testing requirements in the current console.

## iOS release

- [ ] Confirm active Apple Developer and App Store Connect access and authorised release owner.
- [ ] Reconcile marketing version and build number with the release candidate.
- [ ] Confirm bundle ID, entitlements, privacy usage descriptions, icons, and launch assets.
- [ ] Archive successfully in a supported Xcode version.
- [ ] Pass App Store validation.
- [ ] Test fresh install and upgrade on physical iPhone and iPad devices.
- [ ] Verify notification permission and native background scheduling.
- [ ] Verify deep links, share target, offline launch, app updates, and rollback.
- [ ] Complete App Privacy, age rating, category, review notes, and TestFlight testing in the current console.

## Store listing and assets

- [x] Rewrite product copy as a general-purpose habit tracker.
- [ ] Verify the final short and full descriptions against the signed release candidate.
- [ ] Capture release-candidate phone screenshots for Today, Habits, quantitative tracking, Insights, Settings, and optional Collections.
- [ ] Capture required tablet screenshots.
- [ ] Produce and verify store icons and promotional graphics at the current required dimensions.
- [ ] Confirm no screenshot or copy implies cloud sync, medical outcomes, automatic migration, or background behaviour that has not been verified.
- [ ] Confirm support email, support URL, privacy URL, category, and contact ownership.

## Release and rollback

- [ ] Record the exact reviewed commit SHA and generated native build identifiers.
- [ ] Back up existing production data and deployment configuration where applicable.
- [ ] Document web, Android, and iOS rollback procedures.
- [ ] Confirm the previous stable web and native artefacts remain available.
- [ ] Obtain explicit approval before merging PR #106.
- [ ] Obtain explicit approval before deploying or publishing.
- [ ] Perform post-release smoke tests for create, complete, edit, history, export, Collections, offline use, and update behaviour.
- [ ] Monitor only approved operational signals without collecting private habit content.

## Known open decisions

- [ ] Whether native background reminders are included in the first habit-first release.
- [ ] Whether specialist Collections remain permanently embedded or later move to separate maintained modules.
- [ ] Whether gamification remains optional, is redesigned, or is removed from the default product.
- [ ] Whether any future account or sync feature is in scope; none may be implied by the current release.
