# LifeStreak product identity

Last verified: 2026-08-28

This matrix is the canonical repository identity for #57. External Apple and Google records must be compared with it before release; this document does not claim access to or verification of those records.

| Surface | Canonical value |
|---|---|
| Product name | LifeStreak |
| Positioning | Independent, general-purpose, local-first habit and routine tracker |
| Specialist experience | Optional Collections inside LifeStreak |
| Package name | `lifestreak` |
| Capacitor app ID | `com.ashbi.lifestreak` |
| Android namespace/application ID | `com.ashbi.lifestreak` |
| iOS product bundle ID | `com.ashbi.lifestreak` |
| Custom URL scheme | `com.ashbi.lifestreak` |
| Marketing version | `4.0.0` |
| Native build/version code | `400` |
| Production web origin | `https://lifestreak.ashbi.ca` |
| Privacy-policy path | `https://lifestreak.ashbi.ca/privacy.html` |
| Primary roadmap | `docs/ISSUE_ROADMAP.md` |

## Version policy

- Web/package, Android `versionName`, and iOS `MARKETING_VERSION` use the same semantic marketing version.
- Android `versionCode` and iOS `CURRENT_PROJECT_VERSION` use the same monotonically increasing integer when practical.
- A release candidate must increase the native build number above every build already uploaded to the corresponding store.
- Never change the app ID or signing identity to resolve a build problem. Confirm update continuity against the existing store listing first.
- Generated AAB/IPA metadata, signing certificate/team, internal-track listing, and installed upgrade behavior are release evidence; source configuration alone is insufficient.

## Historical terminology

`JW Progress`, `JW News`, `JW Daily Habits Tracker`, and `JW Companion` are not current LifeStreak product names. Historical storage keys beginning with `jw-` remain documented solely so existing local data can be preserved. Older feature/release records may quote historical names but must be clearly marked historical.

## Release identity gate

Before any store upload, record evidence for:

1. Apple App Store Connect bundle ID, current highest build, team/signing identity, and upgrade test.
2. Google Play application ID, current highest version code, signing certificate fingerprint, and internal-track upgrade test.
3. Built IPA/AAB metadata matching this matrix or an explicitly approved newer version.
4. Store name, descriptions, screenshots, privacy declarations, support URL, and privacy URL matching the reviewed release candidate.

