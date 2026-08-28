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
   Inventory every storage key and record shape before changing the default experience. This depends on the persistence/date correctness work in #56, #61, and #62.
3. **#56 — durable service and reading persistence**
   Prove reload/restart behavior, schema validation, migration, corruption recovery, and failed-write UX.
4. **#61 and #62 — calendar-safe specialist history**
   Correct full-date Bible-reading history and service totals before migration fixtures are considered trustworthy.
5. **#96 — unified versioned habit/log model**
   Audit the recovered implementation against every acceptance criterion, especially atomic persistence, version migrations, corrupted data, and source-record reproducibility.
6. **#57 and #59 — canonical identity, permissions, and privacy metadata**
   Reconcile package, Capacitor, Android, iOS, store, privacy, version/build, and permission declarations. Current identifiers align, but iOS and Android versions still differ and unused iOS permission declarations remain.
7. **#58 — fail-closed Android signing**
   Verify missing-secret failure, protected signing, certificate identity, ownership, backup, and recovery.
8. **#60 — required quality gates and immutable release artifacts**
   Repair CI so pull requests validate without publishing and releases consume tested immutable artifacts.

### P1 — complete and verify the core habit experience

9. **#64 — supported Node/npm/Vite toolchain**
   Establish one reproducible runtime matrix before updating or merging dependency pull requests.
10. **#70 and #97 — onboarding and habit management**
    The recovered branch partially implements both. Finish progressive disclosure, template customization, restored-user behavior, failure recovery, accessibility, and device verification.
11. **#71 and #98 — schedule, due-state, streak, and calendar contract**
    Treat these as one correctness track. Add the missing weekly-window/monthly-target behavior, rule explanations, schedule previews, and complete date/timezone coverage.
12. **#74, #75, #99, and #100 — truthful daily operations**
    Verify loading/error/retry/undo, lifecycle changes, Today, binary and quantitative tracking, corrections, and duplicate-action safety from one source model.
13. **#72 and #73 — accessibility and responsive baseline**
    Apply to every primary workflow. Issue #41 is one concrete defect within #72 and remains open until its web fix is integrated and verified.
14. **#63 and #76 — privacy-aligned optional AI, push, and reminders**
    Decide what ships, remove misleading capability claims, and verify private notification behavior and recovery.
15. **#66 and #67 — web/PWA/native end-to-end and rollback tests**
    Cover fresh install, upgrade, offline launch, service-worker migration, native shells, deployment, and rollback.
16. **#65 — reproducible native archive pipelines**
    Requires the identity, signing, privacy, quality-gate, and end-to-end tracks above.

### P2 — polish, trust, and operations

17. **#68 — truthful specialist reading data**
    Replace placeholders using the corrected persistence/date contracts.
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

Do not merge #85, #88, #107, or #108 solely to clear Dependabot. First complete #64, then evaluate each update independently with clean install, lint, tests, web build, Android debug build, security review, and release-workflow behavior. Close any PR superseded by the selected supported dependency matrix.

## Completion rules

An issue is complete only when:

1. its acceptance criteria are satisfied on the default branch;
2. automated checks relevant to the change pass;
3. required browser, native, accessibility, privacy, migration, or release evidence is attached;
4. documentation and user-facing promises match the shipped behavior; and
5. incomplete external/manual gates are not represented as complete.
