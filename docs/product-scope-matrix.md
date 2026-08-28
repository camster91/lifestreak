# LifeStreak launch scope matrix

Last verified against source and release copy: 2026-08-28

This is the route, feature, terminology, platform, and promise cross-check for issue #69. [product-control.md](product-control.md) owns the customer and positioning decision; this document maps that decision to the current release candidate. Store-console and built-device evidence remain external gates.

## Primary habit experience

The primary shell is state-based rather than URL-routed. Reloading without `?legacy=1` opens Today; switching a view does not change the URL.

| Surface     | Primary job                                                                          | Shipped on draft branch | Launch treatment               | Evidence still required                                                             |
| ----------- | ------------------------------------------------------------------------------------ | ----------------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| Today       | See genuinely due habits and record binary or quantitative results                   | Yes                     | Primary                        | Real-user logging time; device, keyboard, screen-reader, zoom, and date-boundary QA |
| Habits      | Create, edit, schedule, pause, resume, archive, and inspect history                  | Yes                     | Primary                        | Full manual state and destructive-action review                                     |
| Insights    | Explain schedule-aware rates, streaks, trends, source totals, and weekly review      | Yes                     | Primary                        | Visual snapshots, manual accessibility, and pilot comprehension                     |
| Settings    | Reminder privacy, preferences, portable backup/recovery, diagnostics, and safe reset | Yes                     | Primary                        | Native reminders, quota/private-mode, assistive technology, recovery rehearsal      |
| Collections | Open preserved specialist records through `?legacy=1`                                | Yes                     | Optional compatibility surface | Navigation comprehension, responsive/a11y review, upgrade preservation              |

The primary terminology is **habit**, **routine**, **Today**, **Habits**, **Insights**, **Settings**, and **Collections**. “Streak” describes one explanatory metric; it is not the only success model. JW-specific product names are historical migration terms, not launch branding.

## Collections route inventory

Collections is entered only after an explicit Collections action and always exposes **Back to habits**. Its routes remain compatibility surfaces, not primary launch navigation.

| Route                | User-visible purpose                                                                         | Launch status                   | Constraint                                                           |
| -------------------- | -------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------- |
| `/` with `?legacy=1` | Specialist home and daily spiritual activities                                               | Preserved Collection            | Must not become first-run identity or required onboarding            |
| `/study?legacy=1`    | Study sessions and history                                                                   | Preserved Collection            | Do not flatten notes or duration into inferred habit completions     |
| `/service?legacy=1`  | Service records and goals                                                                    | Preserved Collection            | Preserve exact history; no general-habit claim                       |
| `/reading?legacy=1`  | Books/media progress with source units                                                       | Preserved Collection            | Never fabricate unit or combined percentage                          |
| `/goals?legacy=1`    | Rich specialist goals                                                                        | Preserved Collection            | Distinct from a recurring habit schedule                             |
| `/stats?legacy=1`    | Statistics over Collections records                                                          | Preserved Collection            | Must label aggregation truthfully                                    |
| `/settings?legacy=1` | Collections preferences, reminder configuration, backup, and optional Ollama connection test | Preserved Collection            | Network disclosure and confirmation required; no persisted secret    |
| `/share?legacy=1`    | Receive an operating-system share target and optionally open a validated link                | Preserved compatibility utility | User-directed only; not social sharing, ranking, or developer upload |

## Capability decisions

| Capability                         | Current implementation                                                         | Launch decision                                            | Customer/store promise                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts                           | None                                                                           | Deferred                                                   | No account required                                                                                                                                      |
| Cloud sync / cross-device restore  | None                                                                           | Deferred                                                   | Must not be claimed                                                                                                                                      |
| Behavioral analytics / advertising | None                                                                           | Excluded from launch                                       | No developer analytics, ads, sale, or cross-app tracking                                                                                                 |
| General habit reminders            | Open-app web scheduling plus bounded schedule-aware native local notifications | Included only as optional and private-by-default           | Native source schedules 30 days/60 occurrences and reconciles on app return; physical-device background, timezone/DST, reboot, and delivery proof remain |
| Remote push                        | No push dependency, token, or service                                          | Deferred                                                   | Must not call local reminders “push notifications”                                                                                                       |
| AI coaching                        | None in the primary product                                                    | Deferred                                                   | Must not be claimed                                                                                                                                      |
| Ollama                             | Explicit, disclosed connection test in Collections only                        | Compatibility surface; disabled by default                 | Sends only selected model, fixed test text, and optional session credential to chosen provider                                                           |
| Sharing                            | OS share-target receiver and validated external-link opening in Collections    | Compatibility utility                                      | Not a social feed, public accountability system, or automatic upload                                                                                     |
| Health/calendar integration        | None; no permission/plugin                                                     | Deferred                                                   | Must not be claimed                                                                                                                                      |
| Export/import/recovery             | Versioned local JSON flow covering habits and recognized Collections stores    | Launch trust feature                                       | User-directed; validate before mutation; create verified recovery before replacement                                                                     |
| Billing/entitlements               | None                                                                           | Deferred pending retention and willingness-to-pay evidence | Free pilot only; no customer-visible paid promise approved                                                                                               |
| Social/team features               | None                                                                           | Deferred                                                   | Must not be claimed                                                                                                                                      |
| Medical outcomes                   | None                                                                           | Excluded                                                   | Personal tracker, not a medical device or emergency monitor                                                                                              |

## Platform matrix

| Platform           | Repository state                                                                           | Supported launch claim now                           | Approval gate                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Responsive web/PWA | Production build, service worker, offline/update/rollback contracts, local Chromium matrix | Release candidate only; current public site is stale | Hosted checks, production identity/digest, browser/manual/offline/update/rollback evidence       |
| Android            | Capacitor project, permission/signing contracts, debug and protected AAB workflows         | Source target only                                   | Hosted build, signed AAB, store identity, physical phone/tablet install and upgrade              |
| iOS/iPadOS         | Capacitor project, permission/signing contracts, unsigned and protected archive workflows  | Source target only                                   | Hosted compile/archive, App Store identity, TestFlight, physical iPhone/iPad install and upgrade |
| Desktop native     | No dedicated package                                                                       | Not supported                                        | New product decision and implementation required                                                 |

“Available on web, Android, and iOS” must not appear in customer-facing release copy until the corresponding artifact is approved and reachable. Repository prose may describe them as targets when it states the evidence status.

## Promise reconciliation

| Source                               | Current alignment                                                                                                | Remaining gate                                                                       |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `README.md`                          | Matches independent, local-first habit identity and optional Collections                                         | Default-branch integration                                                           |
| `PRIVACY_POLICY.md`                  | Matches local storage, absent analytics/account, optional network actions, reminder privacy, and deletion limits | Built traffic/permission capture, owner/legal review, hosted exact-copy verification |
| `APP_STORE_SUBMISSION.md`            | Uses the current identity and qualifies unverified notification/cloud/medical claims                             | Current console requirements, signed builds, screenshots, approval                   |
| `APP_STORE_TODO.md`                  | Explicitly distinguishes checked source work from incomplete release proof                                       | Complete every unchecked release-candidate item                                      |
| `docs/product-identity.md`           | Canonical repository values agree across source contracts                                                        | Compare with Apple/Google records and signed metadata                                |
| `docs/permissions-and-data-flows.md` | Maps reachable permissions and optional network destinations                                                     | Inspect merged manifest/entitlements and runtime traffic                             |

## Approval decision

The source matrix is internally consistent enough to proceed with release-candidate validation. It is **not final launch approval**. Close #69 only after the owner approves the scope, built web/native artifacts match this matrix, every public/store promise is rechecked against those artifacts, and material pilot evidence is recorded in [product-control.md](product-control.md).
