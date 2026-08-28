# LifeStreak issue roadmap

Last reconciled: 2026-08-28

This is the authoritative ordering for LifeStreak work. GitHub issues contain the detailed acceptance criteria; this file records disposition, dependencies, and execution order. [product-control.md](product-control.md) is the durable product charter and evidence register. `TODO.md`, `APP_STORE_TODO.md`, and older feature plans are supporting or historical checklists and must not override this roadmap.

## Product decision

LifeStreak is an active, independent, general-purpose, local-first habit tracker. Spiritual routines are optional templates, and the existing specialist experience remains available under Collections while its data is preserved. JW Companion is a separate product and is not LifeStreak's successor.

## Current integration state

- `main` still contains the archived product documentation and legacy default experience.
- The active `codex/lifestreak-habit-first` branch contains the independent-app implementation in open draft PR #106; it is not merged or deployed.
- The branch is reconciled with current `main` and passes formatting, typecheck, lint, 27 files / 231 tests, production web build, the responsive Chromium matrix, dependency audit, product-identity, native-contract, and supply-chain checks locally.
- A local Android debug build previously stopped because the Mac had no Java runtime. The current local Docker image gate cannot run because no Docker daemon is available. GitHub-hosted and third-party checks currently fail before useful execution, except the Dependabot configuration check.
- The branch has not passed the full migration, native archive, device, accessibility, privacy, or release evidence required by the issues below.
- Issues #95-#102 remain open because source on a draft branch is not completion on the default branch and required external/manual evidence is incomplete.

## Execution order

### P0 — establish a safe independent product

1. **#69 and #95 — product contract and independent-app integration**
   [product-control.md](product-control.md) records the initial customer, core job, launch wedge, privacy/platform constraints, explicit deferrals, pricing hypothesis, decision metrics, access, and risk register. [product-scope-matrix.md](product-scope-matrix.md) cross-checks every primary/Collections route, network feature, platform target, and repository/store promise. Keep both tracks open until the source matrix is owner-approved, verified against built artifacts and live store records, integrated to `main`, and tested with real pilot users.
2. **#101 — legacy-data preservation and migration contract**
   The current and historical key inventory and supported-version matrix are maintained in [storage-migration-inventory.md](storage-migration-inventory.md). Classification quarantines future versions, and every known `jw-*` source has a rich representative fixture proving byte-identical source/successor/recovery checksums. Recovery keys include the source identity so rapid migrations cannot overwrite one another. Post-verification cleanup requires typed per-key approval and re-verifies exact successor and recovery bytes before removing only the historical source. Explicit unchecked mapping choices now copy only full-date completion booleans into deterministic ordinary habits/logs; retries are idempotent, collisions fail closed, and rich or ambiguous source data is not copied. Released multi-year/malformed/duplicate fixtures and PWA/native upgrade evidence remain.
3. **#56 — durable service and reading persistence**
   Implemented on the revival branch: v1 schemas validate and quarantine invalid service/reading records, reload tests cover v0 migration, and non-destructive storage failures expose retry/download recovery UI. Keep open for real browser/private-mode/quota and native restart verification.
4. **#61 and #62 — calendar-safe specialist history**
   Implemented on the revival branch: Bible history now uses full local dates with an explicit quarantine for ambiguous legacy day-of-year keys. Every live Bible read/write boundary rejects numeric, yearless, prefixed-quarantine, malformed, and impossible dates, preventing the old collision shape from being recreated after migration. Multi-year, year-boundary streak, leap-day, and invalid-key tests cover the contract. Service totals validate local dates and bound both ends of each period. Keep the issues open until the branch is integrated and timezone/device verification is recorded.
5. **#96 — unified versioned habit/log model**
   The source and calendar contract is documented in [habit-domain.md](habit-domain.md). The revival branch now has TypeScript domain types, runtime validation on load, idempotent v1 migration, and read-after-write verification; native restart and the complete schedule fixture matrix remain tied to #71, #96, and #98.
6. **#57 and #59 — canonical identity, permissions, and privacy metadata**
   Repository contracts are maintained in [product-identity.md](product-identity.md) and [permissions-and-data-flows.md](permissions-and-data-flows.md). Package, Capacitor, Android, and iOS source values now align, and unused Calendar, Tracking, and Push declarations are removed; external store continuity and built-app disclosure evidence remain to verify.
7. **#58 — fail-closed Android signing**
   The repository signing contract and protected workflow are documented in [android-signing.md](android-signing.md). Verify the external keystore fingerprint, backup recovery, signed AAB, and internal-track upgrade before closing.
8. **#60 — required quality gates and immutable release artifacts**
   Pull-request and trusted release-source workflows now enforce clean install/toolchain, format, typecheck, design-system, identity, permissions, fail-closed signing, supply-chain/advisory, lint, tests, production build, Capacitor sync, and a clean native generated diff; publishing remains dependent and cannot run from PR events. [ci-evidence.md](ci-evidence.md) records the exact external check state: GitHub jobs have no runner/steps because of an account billing gate, Ashbi Local CI is queued without execution evidence, and GitGuardian finding 36683862 is a high-confidence environment-variable false positive requiring owner disposition. Intentional gate failures, hosted reruns, immutable publish/deploy identity, and rollback rehearsal remain.

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
    The revival branch now has a production-build Playwright smoke that creates a fixture in an isolated browser context, verifies service-worker control, enters offline mode, reloads from the app shell, and proves the local database is byte-identical. The checker uses a strict preview port and verifies the LifeStreak document identity before accepting browser results, preventing another local service from producing false evidence. Offline state is visible in the habit app. Updates wait for explicit user approval via a tested worker message rather than activating/reloading mid-work. Builds emit `/version.json`, container builds embed the full revision, production smoke verifies revision/worker identity, and the runbook defines immutable rollback plus an emergency worker-disable artifact that preserves local databases. Export/import, interrupted/failed asset updates, actual rollback rehearsal, retained artifacts, browser diversity, and native launch/upgrade remain.
16. **#65 — reproducible native archive pipelines**
    Android PRs compile a generated-drift-checked debug shell; a protected manual/tag workflow verifies the approved certificate and produces a signed AAB. iOS now has a generated-drift-checked unsigned macOS PR compile and a protected manual/tag archive/export workflow. Both release workflows record full commit/version/build/runner/workflow metadata, SHA-256, 30-day retention, and GitHub provenance while leaving public promotion manual. The iOS custody/renewal runbook and export template are repository-owned. GitHub runner execution, protected secret/environment configuration, signed artifact inspection, TestFlight/Play internal-track upgrades, and physical-device evidence remain.

### P2 — polish, trust, and operations

17. **#68 — truthful specialist reading data**
    The fixed 60% dashboard placeholder is removed. New reading records persist their own unit; preserved legacy records without a known unit say `units` instead of borrowing the current form selection. Detail and dashboard use one bounded per-item percentage contract, while the dashboard labels its equal-item average so unlike chapters/minutes are not added together. Empty/completed-only states have no fabricated percentage, quarantined data is disclosed as unknown, and both views expose named progressbar values. Unit and production-browser fixtures prove the 50%/90% details agree with the 70% dashboard average. Keep open until the branch is integrated and responsive/screen-reader Collections verification is recorded.
18. **#77 — portable export/import/reset/recovery**
    A single versioned portable format now covers the habit database plus every recognized specialist store, publishes per-store schema versions, rejects malformed/newer data before mutation, redacts session credentials, and refuses to silently skip corrupt stores. Both interfaces can export the complete format. Import creates and verifies a byte-exact recovery snapshot, replaces present and absent stores deterministically, verifies each mutation, and rolls every store back on failure. Legacy specialist and habit-only backups remain explicit paths. Habit reset copy states exactly what it preserves, and the former Collections “Clear All Data” action is now truthfully scoped to spiritual progress with every unaffected store named. Unit coverage proves redaction, version rejection, full round-trip replacement, recovery creation, and byte-exact failed-write rollback; the production-browser gate downloads a mixed habit/specialist backup, removes both stores, uploads it, confirms replacement, and verifies both return. Quota exhaustion in real engines, older released fixtures, and manual assistive-technology review remain before closure.
19. **#78 — design system and complete interaction-state inventory**
    The repository defines the shared semantic roles, component/state contract, hierarchy rules, touch/focus requirements, and verification matrix in [design-system.md](design-system.md). Global focus and reduced-motion behaviour covers Collections as well as the habit-first shell. All source UI state/progress/module styling now uses semantic primary, secondary, success, warning, danger, and base roles rather than palette-specific Tailwind colours; unused historical `jw-*` aliases are removed. A source checker enforces that contract in both primary CI workflows, while the production-browser gate selects an unused port and verifies LifeStreak identity before accepting results. Add stable light/dark screenshots for every route/key state and complete manual contrast and assistive-technology review before closure.
20. **#102 — schedule-aware insights and weekly review**
    The shared engine supplies schedule-aware denominators, lifecycle-neutral skips/pauses/archives, streak explanations, and colour-independent calendar labels. Insights add 28/84/365-day range selection, category and habit filtering (including historical archived habits), an expected-period-weighted overall rate for active filtered habits, equal-period trend comparison that reports insufficient evidence instead of inventing direction, and quantitative source-value totals. Calculations split effective-dated schedule and tracking changes into bounded segments: new daily/weekly/monthly rules cannot reinterpret earlier denominators, and values with incompatible units or historical targets appear as separate dated metrics rather than one false total. Unit and production-browser fixtures prove daily-to-weekly, mid-week target, and minutes-to-kilometres transitions. Weekly-review suggestions remain deterministic, open the habit editor directly, and persist bounded dismissals for the current calendar week while automatically allowing a later review to surface them again. Import hardening and reload/browser fixtures prove those decisions survive persistence without becoming permanent. Stable visual snapshots, manual assistive-technology review, pilot comprehension, and default-branch integration remain before closure.
21. **#79 — privacy-preserving observability and incident response**
    Raw message/stack/URL/user-agent logging has been replaced with a local-only, schema-versioned diagnostic record capped at 20 entries and 30 days. It retains only fixed error kind/class/fingerprint, fixed route class, platform, app version, and full release revision; no user content is used even to derive the fingerprint. Both interfaces expose explicit sanitized export and deletion. The field/purpose/destination/retention/access inventory and controlled error/outage/deploy/rollback/recovery procedures live in [incident-response.md](incident-response.md). The hourly production smoke now opens or updates one content-free GitHub incident on failure and records recovery before closing it. Local tests simulate private message/stack/query input and prove attributable export without leakage. A root `SECURITY.md` still requires owner approval under the repository security-policy workflow, and the synthetic alert/recovery plus real rollback rehearsal require external execution before closure.
22. **#80 — supply-chain hardening**
    All third-party Actions are now pinned to reviewed commit SHAs with readable version comments, and both Docker bases are pinned to reviewed multi-architecture manifest digests. A repository check enforces immutable references, read-only workflow defaults, trusted PR triggers, npm/Actions/Docker Dependabot coverage, reviewed package-lock licenses, and retained provenance. Write permissions moved to the publishing/signing/scanning/incident jobs that need them. CI blocks high/critical npm advisories and runs a pinned Trivy source scan; image publication scans the pushed digest while retaining BuildKit SBOM/provenance, and native provenance/checksum contracts remain. [supply-chain.md](supply-chain.md) defines update gates, triage targets, and strict time-bounded waiver requirements. Hosted representative updates, fork-secret proof, known-advisory blocking, image scan, and end-to-end attestation tracing remain before closure.

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
