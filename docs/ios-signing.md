# iOS signing ownership and release procedure

LifeStreak's App Store signing identity and provisioning profile are protected production data. Certificates, private keys, profile payloads, passwords, and App Store Connect credentials must not be committed or exposed to pull requests.

## Protected values

- `IOS_DISTRIBUTION_CERTIFICATE_BASE64`: exported Apple Distribution identity and private key in a password-protected PKCS#12 file.
- `IOS_CERTIFICATE_PASSWORD`: PKCS#12 password.
- `IOS_CERT_SHA256`: independently approved SHA-256 fingerprint for the Apple Distribution certificate.
- `IOS_PROVISIONING_PROFILE_BASE64`: App Store distribution profile for `com.ashbi.lifestreak`.
- `IOS_PROVISIONING_PROFILE_NAME`: exact profile name used by Xcode.
- `IOS_TEAM_ID`: approved Apple Developer team.
- `IOS_KEYCHAIN_PASSWORD`: ephemeral CI keychain password.

The `production` GitHub environment must require an authorized reviewer. Pull-request jobs compile with `CODE_SIGNING_ALLOWED=NO` and never receive these values.

## Ownership, renewal, and recovery

The release owner must keep two separately controlled encrypted backups and record certificate serial/fingerprint, expiry, team, profile UUID/name/expiry, creation and revocation history, authorized releasers, and the tested App Store Connect recovery path. Renew before expiry and verify an archive with the replacement identity before revoking the current one. Do not create a replacement team or bundle identifier when access is lost; recover through the approved Apple account process.

## Release evidence

1. Push a reviewed `v*` tag or manually dispatch **Build signed iOS release** against the exact reviewed commit and approve the protected environment.
2. Confirm source, identity, permission, test, build, archive, export, bundle identifier, version/build, and `codesign --verify` gates pass.
3. Download the SHA-named artifact and verify `ios-app-release.sha256`, `ios-release-metadata.json`, and GitHub provenance attestation independently.
4. Upload the exact IPA to TestFlight without rebuilding. Verify a fresh install and an upgrade from the current production version on representative devices, including offline data, notifications, import/export, deep links, and local history continuity.
5. Record workflow URL, artifact digest, App Store Connect build ID, tester evidence, signing/profile expiry, and rollback/withdrawal decision.

Public App Store promotion is intentionally manual and requires a separate approval after TestFlight evidence.
