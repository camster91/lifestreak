# LifeStreak agent instructions

## Product and current direction

LifeStreak is a private, local-first habit and routine tracker for web, Android, and iOS. Its primary experience is general-purpose habit tracking; spiritual routines are optional templates, while the original specialist records remain accessible through Collections.

The product should remain non-punitive, truthful about schedules and progress, local-first by default, and explicit about destructive operations. Do not add streak manipulation, fabricated progress, silent data reinterpretation, behavioural telemetry, cloud sync, AI coaching, billing, social features, or health-platform automation merely because historical code or plans mention them.

## Authority and reading order

Use repository sources in this order:

1. `AGENTS.md` — durable coding-agent execution, safety, and approval rules.
2. `docs/product-control.md` — durable product charter, current-state evidence, risks, launch status, and product decisions.
3. `docs/ISSUE_ROADMAP.md` — authoritative implementation backlog.
4. `docs/product-scope-matrix.md` and `docs/product-identity.md` — scope/platform/release identity contracts.
5. `README.md` — representative product overview and development entrypoint.
6. `docs/habit-first-architecture.md` and other relevant architecture/privacy/release documents.
7. `.github/workflows/*` and package scripts — current mechanical verification/release behaviour.
8. Open GitHub issues and pull requests — live work and exact-head verification state.

Issue/PR state on GitHub is authoritative for live external status. Historical PR descriptions, branch-specific rollout notes, and pre-merge rollback instructions must not silently override current `main` or `docs/product-control.md`.

## Architecture and data model

- React 19 + Vite + TypeScript.
- Capacitor shells for Android and iOS.
- Local-first browser/native storage with versioned habit data and separately preserved specialist/Collections stores.
- Zustand application state.
- Habits support binary and quantitative tracking, flexible schedules, effective-dated rule changes, lifecycle history, and local-calendar semantics.
- Export/import, recovery copies, reset, reminder privacy, offline/PWA behaviour, and native identity/signing are product-safety boundaries.

Read `docs/habit-first-architecture.md` before changing scheduling, historical revisions, persistence, reminders, Collections compatibility, accessibility, import/export/reset, or rollback behaviour.

## Environment and setup

Use the exact repository toolchain declared in `package.json`/`.nvmrc`: Node 22.22.0 and npm 11.17.0 unless a reviewed change intentionally upgrades them.

Representative setup and source checks:

```bash
npm ci
npm run lint
npm test -- --run
npm run build
```

Use the committed lockfile. Do not replace `npm ci` with an unpinned install in CI/release guidance.

Do not commit real user habit data, specialist records, private notes, notification content, signing material, store credentials, production secrets, analytics identifiers, or private backup/export files. Test fixtures must be synthetic.

## Verification

There is no single top-level `verify` command on current `main`; do not invent one in handoffs. The primary CI gate is `.github/workflows/ci.yml` and currently verifies the locked toolchain, typecheck, product identity, design-system contract, permissions/capabilities, Android signing contract, supply-chain/audit/secret/configuration checks, lint, tests, formatting, production build, Capacitor sync, and generated native-shell drift.

Additional scope-dependent gates include responsive/accessibility browser checks, Android/iOS builds, production image/release checks, production smoke, exact-source provenance, store/signing evidence, physical-device upgrades/notifications/offline/recovery, and customer-pilot evidence.

A check only counts when it actually ran successfully for the applicable exact head/artifact/environment. Missing, queued, cancelled, superseded, or infrastructure-failed checks are not passes and are not automatically proof of a source defect.

Never weaken tests, identity/signing contracts, supply-chain/security checks, accessibility requirements, release provenance, native drift checks, backup/recovery behaviour, or production smoke merely to obtain green status.

## Web and native QA

For rendered UI work, verify representative widths when executable browser access exists:

- Mobile: approximately 390 px, plus the architecture's 320 px minimum contract where relevant.
- Tablet: approximately 768 px.
- Desktop: approximately 1366–1440 px.

Check the affected flow plus Today/Habits/Insights/Settings/Collections navigation, touch targets, keyboard operation, focus visibility/return, dialogs, status text, form validation, long content, 200% zoom, reduced motion, forced colours/high contrast, dark theme, loading/error/offline states, virtual-keyboard overlap, PWA update/recovery, and console errors.

For schedule/data work, include local-date, week/month/year boundaries, leap day, daylight-saving changes, unscheduled/future dates, effective-dated edits, pause/archive history, partial/skip/fail semantics, import/export/merge/replace/reset, failed storage writes, malformed backups, and recovery rollback.

Physical iOS/Android notifications, background behaviour, signed upgrades, VoiceOver/TalkBack, store review, and real-user pilot success require separate evidence; do not infer them from desktop browser or source checks.

## Privacy and safety

- Keep user content local-first by default.
- Do not silently transmit habit names, notes, specialist data, backup contents, diagnostics, or behavioural events.
- Notification permission must remain explicitly user initiated; notification copy remains privacy-conscious by default.
- Preserve effective-dated schedule/target/unit/lifecycle history; do not rewrite prior truth after an edit.
- Do not silently convert richer specialist records into boolean habit completions.
- Destructive import/reset/delete operations must preserve the documented recovery/confirmation boundary.
- No account, cloud sync, behavioural telemetry, AI coaching, billing, social feed/rankings, or health-platform automation should be added without a current product decision and the required privacy/security/release review.
- Avoid shame, guilt, punitive streak mechanics, fabricated progress, or manipulative engagement patterns.

If a suspected real secret, signing credential, private user export, or production data appears in repository evidence, stop handling the value/content and report only the repository/path plus remediation need.

## Environments and production boundary

Current product control records:

- local development and CI/test environments;
- web/PWA production at `lifestreak.ashbi.ca`;
- native Android/iOS build/release workflows, with store release and real-device evidence still separate gates.

Do not invent a staging environment or store-release status that is not established by current evidence.

Agents may inspect, implement, test, document, branch, commit, create issues, and open draft PRs when authorised. Without Cameron explicitly approving the exact difficult-to-reverse action, agents must not:

- merge a pull request;
- deploy or alter production, routes, containers, or hosting;
- publish/tag a release or submit to an app store;
- change signing credentials, store credentials, secrets, permissions, access, DNS, network configuration, monitoring, billing, or analytics collection;
- migrate, reset, restore, delete, or overwrite real user data;
- enable behavioural telemetry or cloud transmission;
- recruit/contact pilot users or send external communications;
- make customer-validation, accessibility-compliance, store-approval, or legal claims without the required evidence/review.

A workflow, available credential, image artifact, or deploy script is not itself approval to perform the action.

## Deployment and rollback

Use `docs/product-control.md` plus current release/operations documentation and workflows for release truth. Production claims require inspecting the deployed identity/environment; a successful build or image publication alone is not proof of a successful deployment.

Keep exact-source/release identity and the previous known-good production artifact/route backup where the current release procedure requires them. For local-first data changes, rollback must preserve both current habit data and existing specialist Collections data.

Older text that says the habit-first work lives only on `codex/lifestreak-habit-first` is historical: PR #106 merged on 2026-09-01. Current rollback planning must be based on the actual `main` release history and current production evidence, not on reverting an unmerged integration branch.

If deployed revision, rollback artifact, data compatibility, backup/recovery path, or native upgrade safety cannot be verified, report it as unknown/blocked instead of assuming it.

## Definition of done and handoff

Use Cameron's status model:

1. Completed and verified
2. Completed but awaiting verification
3. In progress
4. Blocked
5. Awaiting client or teammate
6. Next action

Never report **Completed and verified** without the required exact-head source/browser/native/production evidence for the scope.

Every substantial coding handoff should include:

- branch;
- exact commit(s);
- pull request;
- files changed;
- implementation summary;
- checks actually executed and their pass/fail/queued state;
- exact-head CI/security/release evidence inspected;
- screenshots/URLs only when actually captured or verified;
- local data/migration/recovery impact;
- native/store impact;
- deployment/rollback impact;
- remaining risks/blockers;
- production/release status;
- next action and any approval gate.
