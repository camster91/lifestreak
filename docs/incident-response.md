# LifeStreak diagnostics and incident response

## Privacy inventory

LifeStreak does not send client diagnostics automatically. The only client record is `ls-error-logs`, a local JSON array capped at 20 records and 30 days. Users explicitly export it when they choose to share support evidence.

| Field             | Purpose                                                                        | Destination                             | Retention                                                | Access owner                                                      |
| ----------------- | ------------------------------------------------------------------------------ | --------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| `schemaVersion`   | Parse the diagnostic contract                                                  | Local device; user-selected export file | 30 days, maximum 20 records; user can delete immediately | Device user; chosen support recipient only after explicit sharing |
| `recordedAt`      | Order and correlate a failure                                                  | Same                                    | Same                                                     | Same                                                              |
| `kind`            | Distinguish uncaught, promise, React, and native-init failure classes          | Same                                    | Same                                                     | Same                                                              |
| `errorClass`      | Identify broad runtime error type without message text                         | Same                                    | Same                                                     | Same                                                              |
| `fingerprint`     | Correlate identical failures without retaining raw message or stack            | Same                                    | Same                                                     | Same                                                              |
| `route`           | Identify one fixed application route; queries and unknown paths become `other` | Same                                    | Same                                                     | Same                                                              |
| `platform`        | Distinguish web, Android, or iOS                                               | Same                                    | Same                                                     | Same                                                              |
| `appVersion`      | Attribute the release                                                          | Same                                    | Same                                                     | Same                                                              |
| `releaseRevision` | Attribute the exact build/release digest                                       | Same                                    | Same                                                     | Same                                                              |

Prohibited fields include habit names, schedules, log dates/values, notes, specialist records, raw error messages, stacks, component stacks, URL queries/fragments, arbitrary paths, user-agent strings, device identifiers, IP addresses, session replay, and behavioral analytics.

The server-side synthetic smoke stores only public endpoint status, fixed identity/header assertions, workflow/run identity, platform, and deployed revision. Failures create or update a GitHub issue visible to repository operators; successful recovery comments and closes that issue. GitHub retains workflow and issue history according to repository/GitHub retention settings. Repository owner `camster91` is the current operations, support, and security-routing owner; security reports follow `SECURITY.md` once published, or a private GitHub security advisory until then.

## Controlled verification

1. Run the diagnostics unit test. Its simulated error contains a private habit name, note, stack, and query. Confirm none appears in local storage/export while platform, version, and 40-character revision do.
2. In Settings, export diagnostics and inspect the JSON before sharing. Delete it and confirm `ls-error-logs` is absent.
3. Dispatch Production Smoke against the healthy endpoint and record the run URL.
4. To rehearse an outage, use a temporary workflow branch or controlled test hostname; do not interrupt production merely to test alerting. Force one fixed assertion to fail, confirm one sanitized issue is created/updated, restore the assertion, rerun, and confirm recovery is recorded and the issue closes.
5. For deploy/rollback rehearsal, follow [deployment-ashbi-vps.md](deployment-ashbi-vps.md), preserve the prior immutable image, verify `/version.json`, and compare local databases before/after the rollback. Never clear browser records as a rollback step.

## Incident procedure

1. Acknowledge the alert and record start time, failing checks, platform, app version, revision, and release artifact digest. Do not request personal data.
2. Reproduce with the public app-shell, manifest, version, worker, and header checks. Check candidate/container health and immutable image identity.
3. If support evidence is needed, ask the user to review and explicitly export sanitized diagnostics. Do not ask for a complete LifeStreak backup unless recovery of their own records is the stated purpose.
4. Stop promotion. Roll back the route to the last verified immutable image using the deployment runbook. Use the emergency worker only for a confirmed worker/cache incident and record its digest.
5. Verify public checks, offline restart, update behavior, and byte-identical local records. Record recovery time and close the automated issue only after the independent check passes.
6. Write a content-free review: cause, affected versions/platforms, detection gap, rollback/recovery evidence, and preventive action. Rotate credentials only when exposure is plausible; never paste credentials or user records into the issue.
