## Purpose

Describe the bounded change and the current product/backlog authority it serves.

## Scope

- In scope:
- Out of scope:
- Related issue/roadmap item:
- Web / Android / iOS / Collections / data area affected:

## Exact-head verification

Record only checks that actually ran on this head/artifact.

- [ ] Toolchain matches repository Node/npm contract
- [ ] `npm run typecheck`
- [ ] `npm run identity:check`
- [ ] `npm run design-system:check`
- [ ] `npm run permissions:check`
- [ ] `npm run signing:check`
- [ ] `npm run supply-chain:check` / applicable audit and security scan
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run format:check`
- [ ] `npm run build`
- [ ] Capacitor sync/native-shell drift check when applicable
- [ ] Exact-head CI/release status inspected

Evidence/results:

## Responsive / accessibility / reliability QA

When the affected scope requires it:

- [ ] Mobile (~390 px; include 320 px minimum contract where relevant)
- [ ] Tablet (~768 px)
- [ ] Desktop (~1366–1440 px)
- [ ] Keyboard/focus/dialog/accessibility basics
- [ ] 200% zoom / reduced motion / forced colours / dark theme where relevant
- [ ] Offline/PWA update/recovery states
- [ ] Schedule/date-boundary and persistence failure cases
- [ ] Import/export/merge/replace/reset/recovery cases
- [ ] Collections compatibility

Physical-device / screen-reader evidence actually obtained:

## Privacy and data integrity

- [ ] No real habit data, specialist records, private notes, signing material, store credentials, production secrets, or user backups were added to GitHub evidence.
- [ ] Local-first and notification-privacy boundaries remain intact.
- [ ] Effective-dated history and truthful schedule/progress semantics remain intact.
- [ ] Destructive operations preserve the documented recovery/confirmation boundary.
- [ ] No behavioural telemetry, cloud transmission, AI coaching, billing, social feature, or health-platform automation was introduced without an explicit current product decision.
- [ ] Required tests/security/supply-chain/native/release gates were not weakened merely to obtain green status.

## Deployment / native release / rollback boundary

Production or store state changed: **No unless separately and explicitly approved.**

- Web/PWA deployment impact:
- Native/signing/store impact:
- Data/schema/upgrade impact:
- Previous known-good artifact/route evidence:
- Rollback/recovery evidence:
- Pilot/customer/legal dependencies:

## Handoff

Use the repository status model:

1. Completed and verified
2. Completed but awaiting verification
3. In progress
4. Blocked
5. Awaiting client or teammate
6. Next action

Remaining risks/blockers:

Next action / approval gate:
