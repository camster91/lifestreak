# LifeStreak issue roadmap

Last reconciled: 2026-08-28

This is the authoritative ordering for LifeStreak work. GitHub issues contain the detailed acceptance criteria; this file records disposition, dependencies, and execution order. `TODO.md`, `APP_STORE_TODO.md`, and older feature plans are supporting or historical checklists and must not override this roadmap.

## Product decision

LifeStreak is an active, independent, general-purpose, local-first habit tracker. Spiritual routines are optional templates, and the existing specialist experience remains available under Collections while its data is preserved. JW Companion is a separate product and is not LifeStreak's successor.

## Current integration state

- `main` still contains the archived product documentation and legacy default experience.
- The recovered `codex/lifestreak-habit-first` branch contains the independent-app implementation from closed PR #106.
- The recovered branch is reconciled with current `main` and passes clean install, formatting, typecheck, lint, 145 tests, production web build, Capacitor Android sync, and dependency audit locally.
- A local Android debug build reaches a successful web build and Capacitor sync, then stops because the current Mac has no Java runtime. GitHub-hosted jobs currently fail before executing any steps, while the independent Ashbi Local CI check remains external to the repository.
- The branch has not passed the full migration, native archive, device, accessibility, privacy, or release evidence required by the issues below.
- Issues #95-#102 were reopened because PR #106 was closed without merge; source on a closed branch is not completion on the default branch.

## Execution order

### P0 — establish a safe independent product

1. **#69 and #95 — product contract and independent-app integration**
   Reconcile terminology, navigation, platform scope, privacy promises, AI/push scope, and the recovered habit-first implementation. These are overlapping decision and implementation tracks and should be completed together.
2. **#101 — legacy-data preservation and migration contract**
   The current and historical key inventory is maintained in [storage-migration-inventory.md](storage-migration-inventory.md). Implement and verify its non-destructive migration sequence after the persistence/date correctness work in #56, #61, and #62.
3. **#56 — durable service and reading persistence**
   Implemented on the revival branch: v1 schemas validate and quarantine invalid service/reading records, reload tests cover v0 migration, and non-destructive storage failures expose retry/download recovery UI. Keep open for real browser/private-mode/quota and native restart verification.
4. **#61 and #62 — calendar-safe specialist history**
   Implemented on the revival branch: Bible history now uses full local dates with an explicit quarantine for ambiguous legacy day-of-year keys, and service totals validate local dates and bound both ends of each period. Keep the issues open until the branch is integrated and timezone/device verification is recorded.
5. **#96 — unified versioned habit/log model**
   The source and calendar contract is documented in [habit-domain.md](habit-domain.md). The revival branch now has TypeScript domain types, runtime validation on load, idempotent v1 migration, and read-after-write verification; native restart and the complete schedule fixture matrix remain tied to #71, #96, and #98.
6. **#57 and #59 — canonical identity, permissions, and privacy metadata**
   Repository contracts are maintained in [product-identity.md](product-identity.md) and [permissions-and-data-flows.md](permissions-and-data-flows.md). Package, Capacitor, Android, and iOS source values now align, and unused Calendar, Tracking, and Push declarations are removed; external store continuity and built-app disclosure evidence remain to verify.
7. **#58 — fail-closed Android signing**
   The repository signing contract and protected workflow are documented in [android-signing.md](android-signing.md). Verify the external keystore fingerprint, backup recovery, signed AAB, and internal-track upgrade before closing.
8. **#60 — required quality gates and immutable release artifacts**
   Repair CI so pull requests validate without publishing and releases consume tested immutable artifacts.

### P1 — complete and verify the core habit experience

9. **#64 — supported Node/npm/Vite toolchain**
   The supported contract is documented in [toolchain.md](toolchain.md): exact Node 22.22.0 and npm 11.17.0 with compatible Vite 7/plugin-react 5/React 19 majors across local version files, CI, Docker, and native workflows. Keep open until clean installs and native builds run on the pinned environment; then triage each dependency PR independently.
10. **#70 and #97 — onboarding and habit management**
    The revival branch has optional/replayable private offline onboarding, restored-user guards, minimal and advanced creation, editable ordinary templates across spiritual/health/planning/learning/home/wellbeing, icons, duplicate/edit/lifecycle/delete/undo workflows, and visible failed-save recovery. Template pre-customization, unsaved-change browser walkthroughs, and responsive/device verification remain.
11. **#71 and #98 — schedule, due-state, streak, and calendar contract**
    The revival branch now adds weekly-window and monthly-target schedules/statistics, optional end dates, period opportunity summaries, future-log exclusion, live schedule previews, user-reorderable time groups, accessible calendar names, specific streak-break explanations, and a UTC−12/UTC+14/DST automated matrix. Real browser/native interaction walkthroughs remain.
12. **#74, #75, #99, and #100 — truthful daily operations**
    The revival branch now uses verified transactions with rollback on failed or silently dropped writes, warns instead of claiming success for no-op mutations, coalesces identical rapid submissions, and provides Undo. Today is generated from the shared habit/schedule/log model; pause/archive/restore and ordering preserve history; numeric source entries can be corrected or removed with destructive confirmation. Browser offline/failure workflows plus responsive, accessibility, reminder, native-restart, and exhaustive tracking-unit verification remain.
13. **#72 and #73 — accessibility and responsive baseline**
    The revival branch replaces the concrete #41 interactions with named semantic buttons and adds a headless Chromium gate across 320px phone, phone, tablet, and desktop viewports. It checks primary empty routes and the creation dialog for horizontal overflow, accessible control names, 44px targets, reduced motion, focus containment, Escape close, and focus restoration. VoiceOver/TalkBack, 200% zoom, forced-colour, populated/long-content states, landscape, virtual keyboard, screenshot approval, and native device checks remain.
14. **#63 and #76 — privacy-aligned optional AI, push, and reminders**
    Remote push is excluded. Optional Ollama remains disabled by default and its only reachable connection test now requires an inline destination/payload/credential confirmation; API keys are session-only, cleared on opt-out, and cannot come from build-time client secrets. Reminder rescheduling checks permission without prompting, only explicit Enable can request permission, default lock-screen content is generic, disable cancels schedules, and Collections offers labeled per-item controls plus a private test. Native denial/settings, timezone/DST, habit-reminder integration, traffic capture, and device verification remain.
15. **#66 and #67 — web/PWA/native end-to-end and rollback tests**
    The revival branch now has a production-build Playwright smoke that creates a fixture in an isolated browser context, verifies service-worker control, enters offline mode, reloads from the app shell, and proves the local database is byte-identical. Offline state is visible in the habit app. Updates wait for explicit user approval via a tested worker message rather than activating/reloading mid-work. Builds emit `/version.json`, container builds embed the full revision, production smoke verifies revision/worker identity, and the runbook defines immutable rollback plus an emergency worker-disable artifact that preserves local databases. Export/import, interrupted/failed asset updates, actual rollback rehearsal, retained artifacts, browser diversity, and native launch/upgrade remain.
16. **#65 — reproducible native archive pipelines**
    Android PRs compile a generated-drift-checked debug shell; a protected manual/tag workflow verifies the approved certificate and produces a signed AAB. iOS now has a generated-drift-checked unsigned macOS PR compile and a protected manual/tag archive/export workflow. Both release workflows record full commit/version/build/runner/workflow metadata, SHA-256, 30-day retention, and GitHub provenance while leaving public promotion manual. The iOS custody/renewal runbook and export template are repository-owned. GitHub runner execution, protected secret/environment configuration, signed artifact inspection, TestFlight/Play internal-track upgrades, and physical-device evidence remain.

### P2 — polish, trust, and operations

17. **#68 — truthful specialist reading data**
    The fixed 60% dashboard placeholder is removed. New reading records persist their own unit; preserved legacy records without a known unit say `units` instead of borrowing the current form selection. Detail and dashboard use one bounded per-item percentage contract, while the dashboard labels its equal-item average so unlike chapters/minutes are not added together. Empty/completed-only states have no fabricated percentage, quarantined data is disclosed as unknown, and both views expose named progressbar values. Unit and production-browser fixtures prove the 50%/90% details agree with the 70% dashboard average. Keep open until the branch is integrated and responsive/screen-reader Collections verification is recorded.
18. **#77 — portable export/import/reset/recovery**
    Reconcile specialist and habit-first backup formats and validate destructive recovery paths.
19. **#78 — design system and complete interaction-state inventory**
    Consolidate the recovered habit UI and Collections UI without obscuring state or accessibility.
20. **#102 — schedule-aware insights and weekly review**
    The recovered implementation is partial; filters, calendar detail, explainability, edit/dismiss behavior, and cross-view agreement remain to verify.
21. **#79 — privacy-preserving observability and incident response**
    Operational signals must exclude private habit content.
22. **#80 — supply-chain hardening**
    Pin release dependencies and reduce automation permissions after the supported toolchain is settled.

## Tracking and umbrella issues

- **#81** is the previous combined backlog index. Keep it only as a historical pointer and close it once this roadmap is merged and linked from the issue.
- **#82** is the previous shipping plan. Its release gates are incorporated above and in `APP_STORE_TODO.md`; close it as superseded after reconciliation is merged.
- **#83** is the previous UX roadmap. Its actionable work remains in #69-#80 and #95-#102; close it as superseded after reconciliation is merged.

## Duplicate, stale, and resolved audit issues

- **#40** — closed as an exact duplicate of #41.
- **#41** — wording references React Native, which this repository does not use, but the underlying inaccessible click-target defect was confirmed in `ProjectsTab` and `AchievementPopup`. Keep open until the corrected semantic buttons are integrated and verified.
- **#42** — closed as already resolved by commit `249c0da` / PR #50; the stale cross-product CORS origin is absent from current source.

## Dependency pull requests

- **#85** — closed as superseded by the independently verified ESLint 10 alignment in `21cab47`.
- **#88** — closed as incompatible: v4 is ESM-only while `dev-server.cjs` uses CommonJS. Dependabot now ignores this major until a deliberate server migration.
- **#107** — closed as superseded by the independently verified Capacitor local-notifications 8.3.1 update in `5cfc4fe`; web gates and both native syncs pass.
- **#108** — closed as an unsupported TypeScript 7 major under the pinned TypeScript 6 contract. Dependabot now ignores this major pending deliberate review.

PR #106 is now the only open pull request. Future dependency updates must remain within [the supported toolchain contract](toolchain.md) and pass clean install, lint, tests, web build, native sync/build as applicable, security review, and release-workflow behavior.

## Completion rules

An issue is complete only when:

1. its acceptance criteria are satisfied on the default branch;
2. automated checks relevant to the change pass;
3. required browser, native, accessibility, privacy, migration, or release evidence is attached;
4. documentation and user-facing promises match the shipped behavior; and
5. incomplete external/manual gates are not represented as complete.
