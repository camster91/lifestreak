# Historical progress fixtures

These fixtures use the persisted `jw-progress-storage` envelope and field names found in repository commit `41d97f43313b4bcc352d8b09793f896b588bd826` (the 2026-05-24 initial import). The repository has no Git tags or GitHub releases, so they are **repository-history-derived compatibility fixtures**, not claimed release artifacts or real user records.

- `legacy-progress-initial-import-multiyear.json` combines supported initial-import shapes across multiple years. It deliberately includes the historical yearless Bible day key and an impossible full date to prove only unambiguous valid dates can become habit logs while the raw source remains byte-identical.
- `legacy-progress-duplicate-key.json` preserves a duplicate completion date exactly as raw JSON. Duplicate object keys are ambiguous because ordinary `JSON.parse` would silently keep only the last value; the store must quarantine and refuse to map this payload.
