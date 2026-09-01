# LifeStreak CI evidence register

Last verified: 2026-08-28 against draft PR #106 at commit `95b2651005e895edbf677ee50d4812e8a16c1b9b`.

This register separates source/workflow evidence from account, installed-app, and external-runner state for issue #60. A green local run does not substitute for hosted execution, and an external check name does not prove which gate ran.

## Current PR checks

| Check                    | Authoritative evidence                                                                                 | Classification                                                                                            | Required next action                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Habit-first verification | GitHub run `33204758518`, job `98962861497`: runner ID `0`, no steps, one failure annotation           | External account gate: “recent account payments have failed or your spending limit needs to be increased” | Owner resolves GitHub Billing & plans, then reruns exact head                                                                  |
| Android debug build      | GitHub run `33204758534`, job `98962861016`: runner ID `0`, no steps, same annotation                  | External account gate                                                                                     | Same billing resolution and rerun                                                                                              |
| Unsigned iOS compile     | GitHub run `33204758538`, job `98962861236`: runner ID `0`, no steps, same annotation                  | External account gate                                                                                     | Same billing resolution and rerun                                                                                              |
| Ashbi Local CI           | Check run `98962853705` is queued for exact head; its output contains no executed steps or annotations | External runner/app gate, not evidence of success or failure                                              | Restore/inspect the external runner and require a terminal result for the current head                                         |
| GitGuardian              | Check run `98962852964`, finding `36683862`, occurrence `294047756`                                    | Scanner false positive requiring owner disposition                                                        | Resolve the incident as a false positive in the GitGuardian workspace; do not rewrite 104 PR commits without explicit approval |

## GitGuardian triage: finding 36683862

**Verdict:** `not_actionable` with high static confidence for the scanner’s hardcoded-secret claim.

- The cited source is `scripts/verify-android-keystore.sh:6` in commit `6c1fe0fc977951f57ea0083186ae7d374de628aa`.
- The exact line is a Bash required-environment check: `${KEYSTORE_PASSWORD:?Set KEYSTORE_PASSWORD.}`. It contains an environment-variable name and an operator-facing error message, not a password value.
- The script reads the password only from protected release environment configuration and passes it to the local Java `keytool` certificate inspection. Repository search finds no assignment of a keystore password, key password, keystore payload, or signing credential.
- The protected Android release workflow maps `KEYSTORE_PASSWORD` from `${{ secrets.ANDROID_KEYSTORE_PASSWORD }}`. Documentation and `.gitignore` require the keystore and password material to remain external.
- No repository `SECURITY.md` applies to this path, so the intended boundary is derived from the protected release workflow and Android signing contract. This policy absence is a documentation gap, not evidence of an exposed credential.
- The PR contains 104 commits after `main`; GitGuardian scans the cited historical occurrence. A current-source edit cannot remove that occurrence from the PR comparison, and history rewriting is deliberately not performed.

Normalized triage item: `triage-001`; input ID `GitGuardian-36683862`; source type `scanner_ticket`; product surface `trusted developer release tooling`; source trust `trusted_developer_config`; no supported security boundary is crossed by the cited line.

## Repository-enforced gate order

Pull-request verification and trusted release-source verification now require clean install, exact toolchain, format, typecheck, semantic design system, identity, permissions, fail-closed signing, supply-chain/advisory checks, lint, tests, production build, Capacitor sync, and a clean generated Android/iOS diff. The habit-first workflow additionally runs the production-browser responsive/accessibility/privacy/offline/recovery contract. Publishing remains a separate job that depends on successful release-source verification and is unreachable from pull-request events.

## Evidence still required

1. Rerun the exact current head after GitHub account execution is restored.
2. Obtain a terminal independent local-CI result and preserve its executed-command evidence.
3. Exercise intentional failures for format, type, lint, unit test, web build, native sync/drift, audit/secret/misconfiguration scan, and publish dependency without weakening branch protection.
4. Publish one approved immutable image, record its digest/SBOM/provenance, deploy that exact digest, verify `/version.json`, and rehearse rollback to the recorded prior digest.
5. Produce signed Android/iOS artifacts from protected environments and prove fresh-install and upgrade continuity before store promotion.
