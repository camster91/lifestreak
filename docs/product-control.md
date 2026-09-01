# LifeStreak product control

Last reconciled: 2026-09-01. This is the durable product charter, evidence register, and market position. [ISSUE_ROADMAP.md](ISSUE_ROADMAP.md) remains the authoritative implementation backlog, and [product-scope-matrix.md](product-scope-matrix.md) maps this charter to routes, capabilities, platforms, and release promises. Issue and PR states on GitHub remain authoritative for external status.

## Product charter

**Product:** LifeStreak, an independent local-first habit and routine tracker for web, Android, and iOS.

**Initial customer hypothesis:** privacy-conscious people who have abandoned complicated or punitive habit trackers and need flexible schedules or quantitative routines without an account, behavioral tracking, or a subscription before value.

**Core job:** open the app, see what is genuinely due, record the smallest truthful result in seconds, recover from an interruption or missed day without shame, and retain ownership of the complete history.

**Promise hypothesis:** “A private habit tracker that stays out of your way and tells the truth about your routine.” This is researched positioning, not customer-validated messaging.

**Non-negotiable constraints:** local-first by default; no silent user-content transmission; optional network features require informed opt-in; no fabricated progress; no streak manipulation; portable recovery before destructive replacement; WCAG 2.2 AA target; immutable/reproducible releases; existing specialist records preserved as optional Collections.

**Deliberately deferred:** social feed/rankings, public accountability, generic task/project management, server accounts, cloud sync, health-platform automation, AI coaching, billing, and team/enterprise features until the core daily loop and target-customer evidence justify them.

## Current-state truth

### Verified facts

- PR #106 and subsequent release-hardening, dependency, verification, and backlog-reconciliation changes are merged. The independent app is on `main` and released at `https://lifestreak.ashbi.ca/` as revision `c6313758a10efc2495580db0c91630baa3582aaa`.
- The repository has 30 open issues after closing released defects #41/#61/#62/#68 and superseded umbrella trackers #81-#83. Two are verification pending and twenty-eight are externally blocked. Remaining repository-owned verification is concentrated in the visual design-system baseline (#78) and insights acceptance (#102).
- The release source passed 31 files / 281 tests, formatting, typecheck, lint, production build, dependency audit, identity, permission/signing, supply-chain, responsive/accessibility Chromium, Android debug, unsigned iOS, exact-source image build, and published-image high/critical scanning.
- `main` implements versioned habits/logs, flexible schedules, quantitative entries, lifecycle history, onboarding, Today/Habits/Insights/Settings, optional Collections, portable backup/recovery, private reminders, offline PWA behavior, native build/release definitions, sanitized diagnostics, and immutable supply-chain checks.
- Production serves HTTP 200, exact release identity, the PWA manifest/service worker, and required security headers. The prior healthy `b7d4420` container on port `18099` and timestamped Traefik route backup remain the immediate rollback path.
- There is no implemented account, billing, cloud-sync, customer analytics, consented pilot measurement, or verified app-store release.

### Reasonable inferences

- Low-friction daily use, schedule correctness, non-punitive recovery, and data ownership form a coherent differentiator together; privacy alone does not.
- Optional Collections can preserve incumbent records but will confuse the primary product if allowed to dominate onboarding or navigation.
- A free production-like pilot is a safer validation stage than adding billing before retention and willingness-to-pay evidence.

### Unknowns requiring evidence

- Whether the proposed segment will switch, retain, recommend, or pay.
- Median time to first value and daily logging time with real users.
- Real-device iOS/Android background reminders, upgrade preservation, accessibility, and store-review outcomes.
- Production error/reliability rates for the revival branch.
- App-store, trademark, tax, legal-policy, and customer-support readiness.
- Sustainable acquisition channel and support burden.

## Access register

| Capability                      | Current evidence                                                      | Authority / approval                                              | Risk or blocker                                         | Owner            |
| ------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------- | ---------------- |
| Local repository and tests      | Full read/write; branch commits pushed                                | Routine implementation authorized                                 | Preserve unrelated work                                 | Codex / Cameron  |
| GitHub repo, issues, PR         | Authenticated `camster91`; issue comments and branch push work        | Backlog/PR maintenance in goal scope                              | Hosted checks currently fail/queue externally           | Cameron / GitHub |
| Public production               | Revision `c631375` released; smoke run `33505245704` passed           | Explicit approval required before each future deploy/route change | No real-user reliability baseline                       | Cameron          |
| Ashbi VPS / Docker daemon       | Exact source image healthy; prior container and route backup retained | Explicit production approval required for future mutations        | Registry package remains private to unauthenticated VPS | Cameron          |
| Apple/Google stores and signing | Workflows/runbooks exist                                              | Protected credentials and release approval required               | No signed-device/store evidence                         | Cameron          |
| Customer research / pilot       | No participants or consented evidence available                       | Recruitment/contact approval required                             | Position and retention remain hypotheses                | Cameron          |
| Analytics                       | No behavioral telemetry by design                                     | New collection requires privacy/product approval                  | Metrics require consented pilot or local export         | Cameron          |
| Billing / Stripe                | Not implemented                                                       | Pricing and billing change require explicit approval              | No willingness-to-pay or unit-economics validation      | Cameron          |
| Support/security channel        | Sanitized diagnostics/runbook exist                                   | Root `SECURITY.md` requires owner approval under policy workflow  | No public support SLA or approved disclosure policy     | Cameron          |

## Market evidence (researched 2026-08-28)

### Competitive set

| Alternative                                                                             | Current evidence                                                                                                                                                                                                                                                                                                                                    | Strength                                                            | Gap/opportunity for LifeStreak                                                                                                                |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [Habitify](https://habitify.me/pricing)                                                 | Free: 3 habits; Premium shown at $2.49/month billed annually and $59.99 lifetime; cross-platform sync, advanced reminders, calendar/health/automation. [April 2026 tier change](https://feedback.habitify.me/changelog/new-tiered-pricing) separates Free, Plus, and Pro.                                                                           | Mature cross-platform breadth and integrations                      | Pricing/tier complexity and cloud dependence leave room for simpler local ownership, but LifeStreak lacks sync/integrations                   |
| [Streaks](https://apps.apple.com/us/app/streaks/id963034692)                            | $5.99 one-time in the US App Store; 24 tasks, Apple Health, reminders, notes, rich Apple-platform support                                                                                                                                                                                                                                           | Polished, award-winning native Apple experience and simple purchase | Apple-only and streak-centric; LifeStreak can be cross-platform and less punitive, but currently trails native polish/widgets/health          |
| [Strides](https://www.stridesapp.com/help/)                                             | Free top 3 trackers; Plus adds unlimited tracking, sync/backup, reports, tags/filters, archive/export/privacy lock; subscription and lifetime options                                                                                                                                                                                               | Multiple tracker types and deep goal analytics                      | LifeStreak’s quantitative/flexible model is competitive in principle, but reports and sync need stronger validation                           |
| [TickTick](https://ticktick.com/upgrade)                                                | Free includes 5 habits; Premium $49.99/year with 299 habits plus broad task/calendar features                                                                                                                                                                                                                                                       | Cross-platform all-in-one productivity suite                        | Customer discussions report all-in-one complexity and price sensitivity; LifeStreak should remain focused rather than copy project management |
| [Finch](https://help.finchcare.com/hc/en-us/articles/38755205001869-Finch-Plus-Pricing) | Finch Plus $9.99/month or $69.99/year                                                                                                                                                                                                                                                                                                               | Strong emotional/self-care engagement and customization             | LifeStreak should offer compassionate language without creating a high-maintenance game layer                                                 |
| [Loop Habit Tracker](https://github.com/iSoron/uhabits)                                 | Free, open source, Android-only, offline, no account, no ads/IAP, private                                                                                                                                                                                                                                                                           | Strong privacy and price benchmark with long-term trust             | Proves local-first is not unique; LifeStreak needs superior cross-platform UX, quantitative truth, recovery, and release quality              |
| New privacy-first entrants                                                              | [Habitt](https://www.reddit.com/r/ShowYourApp/comments/1u5ju2v/i_built_this_free_private_habit_tracker_after_3/) and [HabitGate](https://www.reddit.com/r/SideProject/comments/1sukfw7/ios_habitgate_privacyfirst_habit_tracker_with/) claim local-first/no-account tracking, flexible schedules, export, deep stats, and low/free lifetime pricing | Fast-moving, focused, privacy-led competition                       | Privacy, export, and “no bloat” are category expectations for this wedge—not sufficient differentiation                                       |

### Customer-problem signals

Recent community discussions repeatedly describe daily logging as another chore, feature overload, setup/maintenance friction, annoying notifications, subscription fatigue, and abandoning the app after initial enthusiasm. Evidence includes [“too convoluted”](https://www.reddit.com/r/ProductivityApps/comments/1uecxgy/anyone_else_find_that_productivityhabit_tracker/), [logging friction and forgotten apps](https://www.reddit.com/r/ProductivityApps/comments/1uo5ise/habit_tracker_apps_why_though/), [falling off after weeks](https://www.reddit.com/r/ProductivityApps/comments/1u0bi0x/ive_tried_multiple_productivity_and_habittracking/), and [simpler tools proving stickier](https://www.reddit.com/r/ProductivityApps/comments/1s8i4cg/what_are_the_tools_that_actually_help_you_stick/). These are directional, self-selected community signals, not representative market validation.

## Competitive position and decision

**Decision (proposed, reversible):** focus the launch pilot on privacy-conscious individual self-trackers with flexible or quantitative routines who dislike bloated/punitive subscription trackers.

**Reasons to switch:** no account; no behavioral telemetry; complete portable ownership; schedule-aware due states; quantitative source entries; explicit skip/pause/archive semantics; non-shaming review; web+iOS+Android shell; recovery-first destructive operations.

**Defensible combination to prove:**

1. Daily tracking requires one obvious action and completes in under five seconds for a configured binary habit.
2. Flexible schedules and quantitative values produce identical truthful results across Today, history, insights, and export.
3. Misses/skips/pauses are explainable and adjustable rather than manipulative.
4. All data remains usable offline and recoverable without an account or vendor.
5. Web and native releases preserve the same identity, data, accessibility, and rollback contracts.

**Reversal conditions:** change the wedge if five or more qualified pilot users consistently require a different primary job, if fewer than 40% reach first value unaided, or if fewer than 25% of activated participants return in week four despite core-loop usability meeting threshold.

## Pricing and unit economics

**Current state:** no billing, entitlement system, paid service dependency, or customer willingness-to-pay evidence.

**Recommendation requiring owner approval before implementation:** launch a small free pilot. Do not charge for an unvalidated local-only build. After retention evidence, test transparent packaging: an unlimited local/offline core at no charge; a one-time supporter purchase or paid tier only when it funds concrete value such as encrypted sync, health integrations, widgets, or sustained support. Do not lock export, deletion, recovery, accessibility, or basic truthful tracking behind payment.

Competitor anchors span $5.99 one-time (Streaks), $2.49/month annual equivalent or $59.99 lifetime (Habitify), $49.99/year (TickTick), and $69.99/year (Finch). A proposed later test range is $19–29 one-time for a local “Supporter” package or $24–39/year only after recurring cloud value exists. This is a research hypothesis, not an approved customer-visible price.

Local-only variable cost is near zero beyond distribution/support; the real costs are development, signing/store fees, monitoring, support, and future sync infrastructure. Before paid launch, model store/payment fees, infrastructure/storage/bandwidth, support minutes per active user, refund rate, and a gross-margin target of at least 80% for non-AI plans. Optional Ollama connectivity should remain bring-your-own-provider and off by default unless evaluations prove product value.

## Metrics and decision rules

No behavioral telemetry is currently collected. Pilot metrics require informed consent and should be gathered through participant logs/surveys or an explicitly reviewed local metrics export.

| Metric                       | Definition                                                                      | Pilot threshold / decision rule                                           | Source status                               |
| ---------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| Activation                   | Participant creates a real habit and records a truthful result in first session | ≥70% unaided                                                              | No baseline                                 |
| Time to first value          | Launch to first saved result, excluding consent/research setup                  | Median ≤2 minutes                                                         | No baseline                                 |
| Daily binary logging time    | Open Today to persisted completion                                              | Median ≤5 seconds                                                         | Browser automation is not customer evidence |
| Core-task correctness        | Today/history/insights/export agree for representative schedule/value           | 100% test and pilot discrepancies resolved                                | Automated evidence partial                  |
| Week-1 / Week-4 retained use | Activated participant records at least one intended result in week              | ≥50% / ≥25% for pilot hypothesis                                          | No baseline                                 |
| Recovery success             | Participant exports and restores without data loss                              | 100% scripted; ≥90% unaided pilot                                         | Browser scripted evidence exists            |
| Accessibility task success   | Keyboard/screen-reader/zoom participant completes core loop                     | 100% critical tasks, no blocker                                           | Automated partial; manual missing           |
| Reliability                  | Crash-free pilot sessions and successful app-shell checks                       | ≥99.5%; no data-loss event                                                | No production baseline                      |
| Satisfaction                 | “Would be very disappointed” and task ease                                      | ≥30% very disappointed as early signal; median ease ≥5/7                  | No baseline                                 |
| Willingness to pay           | Qualified retained users choose realistic package/price                         | Do not implement billing without ≥5 interviews and a purchase-intent test | No evidence                                 |

## Risk register

| Risk                                | Severity             | Evidence / consequence                                       | Mitigation and owner                                                                       |
| ----------------------------------- | -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Native/store release unverified     | High release risk    | Web/PWA is released; signed store continuity is unproven     | Protected signed builds, internal tracks, and physical-device upgrades; Cameron            |
| Hosted CI/action restriction        | High                 | PR checks fail/queue without executing useful jobs           | Resolve account runner restriction or rely on approved local runner, then rerun; Cameron   |
| No real-customer evidence           | High product risk    | Position, retention, and pricing are hypotheses              | Recruit consented 5–10 person pilot after release candidate; Cameron approval              |
| Native/device evidence missing      | High release risk    | Notifications, upgrades, accessibility may fail on device    | Signed internal builds and physical-device matrix; Cameron                                 |
| Local-only data loss/device loss    | High trust risk      | Portable backup is manual; no sync                           | Make backup first-class, rehearse recovery, research encrypted sync only after core launch |
| Dual habit/Collections UI confusion | Medium-high          | Preserved specialist product competes with primary hierarchy | Keep Collections optional, audit navigation/copy, measure pilot confusion                  |
| Crowded low-price market            | High commercial risk | Free/open-source and polished low-cost competitors exist     | Win focused job; defer billing; validate switch/retention before acquisition spend         |
| Security disclosure policy absent   | Medium-high          | Runbook exists but no approved root policy                   | Owner approves scoped `SECURITY.md` draft                                                  |
| No approved legal/store claims      | High release risk    | Privacy/store docs are implementation drafts                 | Human/legal/store review before publication                                                |

## Launch standard and status

Status: **web/PWA released**, not store-released, not customer-validated, and not launch-ready.

Release-candidate approval requires: merged/current source; green hosted or independently trusted full web/native/security/supply-chain checks; responsive and WCAG manual evidence; real-device notification/offline/update/upgrade/recovery evidence; production version/digest and rollback monitoring; approved privacy/support/security/store materials; zero known critical/high launch risk; and a production-like pilot plan. Market-leading and product-market-fit claims require subsequent real customer and business evidence.

## Work log

- 2026-08-28: reconciled 37 open issues and draft PR #106 into the issue roadmap; kept issues open where default-branch/manual/external gates remain.
- 2026-08-28: implemented and verified habit-first domain, daily workflow, migration preservation, truthful operations, accessibility/responsive browser contract, privacy opt-ins, PWA recovery, native provenance, reading truthfulness, atomic portable backup, semantic design tokens, deeper insights, sanitized diagnostics/incident response, and immutable supply-chain enforcement across commits referenced in issue comments.
- 2026-08-28: live production inspection proved the public deployment is stale and `/version.json` is not serving release identity; no deployment action taken.
- 2026-08-28: current market/pricing research established a crowded category and a focused low-friction/private/truthful hypothesis; no customer validation or pricing approval claimed.
- 2026-09-01: merged PR #106 and release-hardening PRs #119/#123/#124; released exact revision `b7d4420` with a healthy rollback target, clean published-image scan, and passing public production smoke.
- 2026-09-01: replaced the stale integration-pending backlog state, closed released defects #41/#68, and closed superseded aggregate trackers #81-#83; 32 individually scoped issues remained.
- 2026-09-01: merged PR #131 with explicit UTC-12, UTC+14, DST, leap-day, and year-boundary verification; closed released calendar-history issues #61/#62, leaving 30 open issues.
- 2026-09-01: reclassified #60/#64/#67/#79/#80 from actionable to external blocked after repository-owned work was exhausted; at that checkpoint the remaining backlog was 14 verification-pending and 16 external-blocked issues.
- 2026-09-01: released exact revision `c631375` after source, native, multi-architecture image, zero-high/critical scan, candidate, cutover, and independent public-smoke verification; retained `b7d4420` as rollback.
- 2026-09-01: completed #56 specialist-store recovery and #100 quantitative-type verification matrices; reclassified #56/#70/#71/#74/#75/#95-#100 as externally blocked where only owner, native, physical-device, or manual acceptance evidence remains. The backlog is now 3 verification-pending and 27 external-blocked issues.
- 2026-09-01: completed #77 real-capacity portable-import recovery evidence and reclassified it as externally blocked pending private-mode, historical-device-upgrade, and manual assistive-technology evidence; 2 verification-pending and 28 external-blocked issues remain.
