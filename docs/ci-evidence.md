# LifeStreak CI evidence register

Last verified: 2026-09-01 against released revision `b7d4420c83fd6b43db2db6081f25195fac53b5c0` and documentation merge `44ecc79d38ebcd5836285d2e93c3e5b0828f2b1e`.

This register separates source/workflow evidence from account, installed-app, and external-runner state for issue #60. A green local run does not substitute for hosted execution, and an external check name does not prove which gate ran.

## Released source and production evidence

| Check                        | Authoritative evidence                                                                                                                                      | Classification                                          | Required next action                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Full source and native gates | PR #106 exact-head verifier, Android debug, and unsigned iOS passed; local exact toolchain completed 31 files / 281 tests and the production-browser matrix | Verified for web source and unsigned native compilation | Preserve per-change hosted evidence                                                   |
| Published image              | GitHub run `33498097064` built the final multi-architecture image and passed the high/critical Trivy scan                                                   | Verified                                                | Retain registry provenance/SBOM and continue digest scans                             |
| Production                   | Revision `b7d4420` is healthy on the VPS; route backup and prior healthy container are retained; public smoke run `33499203670` passed                      | Released and rollback-ready                             | Observe reliability and perform a deliberate rollback drill without user-data changes |
| Ashbi Local CI               | Current checks execute with Node 22.23/npm 10.9 instead of exact Node 22.22/npm 11.17                                                                       | Runner contract mismatch, not product evidence          | Align the runner or remove it from required checks under #60/#64                      |
| GitGuardian                  | Finding `36683862` cites an environment-variable requirement, not a secret value; subsequent release PR checks passed                                       | Documented false positive                               | Owner may resolve the historical workspace finding                                    |

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

1. Align Ashbi Local CI to the exact supported Node/npm contract and preserve its executed-command evidence.
2. Keep GitHub branch/ruleset requirements aligned with the trusted verifier, Android, iOS, security, and image gates.
3. Exercise intentional failures for format, type, lint, unit test, web build, native sync/drift, audit/secret/misconfiguration scan, and publish dependency without weakening branch protection.
4. Trace the published registry digest through SBOM/provenance retention and perform a deliberate route rollback/recovery rehearsal; the approved release used an exact-source VPS build because unauthenticated GHCR pull was denied.
5. Produce signed Android/iOS artifacts from protected environments and prove fresh-install and upgrade continuity before store promotion.
