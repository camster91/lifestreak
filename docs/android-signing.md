# Android signing ownership and release procedure

The LifeStreak Play signing identity is external protected production data. No keystore, password, certificate fingerprint, or replacement identity belongs in Git.

## Required protected values

- `ANDROID_KEYSTORE_BASE64`: binary keystore encoded for the protected production environment.
- `ANDROID_KEYSTORE_PASSWORD`: keystore password.
- `ANDROID_KEY_PASSWORD`: private-key password.
- `ANDROID_KEY_ALIAS`: approved alias, normally `lifestreak`.
- `ANDROID_CERT_SHA256`: certificate fingerprint confirmed against Google Play Console.

Repository contributors and pull requests do not receive these values. The manual signed-release workflow uses the protected `production` environment, verifies the fingerprint before Gradle runs, and uploads an AAB named with the immutable commit SHA.

## Ownership and recovery

The authorized release owner must keep at least two encrypted backups in separately controlled locations and record:

- Play Console application ID and app-signing/upload-key arrangement;
- certificate SHA-256 fingerprint and expiry;
- keystore format, alias, creation provenance, and last verification date;
- who can authorize a release or key reset;
- Google Play upload-key reset/recovery procedure;
- evidence that a restored backup produces the approved fingerprint.

Do not generate or substitute a new keystore merely because the original is unavailable. A different certificate can break update continuity. Use the Play-approved recovery process and record the outcome.

## Release evidence

1. Select the reviewed commit and dispatch **Build signed Android release** from the protected production environment.
2. Confirm every source, identity, permission, signing, test, and build gate passed.
3. Confirm the workflow fingerprint matched `ANDROID_CERT_SHA256`.
4. Download the SHA-named AAB and independently inspect package ID, version code/name, and signer certificate.
5. Upload to an internal Play track and verify a fresh install plus upgrade from the current production build.
6. Record artifact digest, workflow URL, Play release ID, tester result, and rollback/withdrawal decision.

Until those steps pass, #58 remains a release blocker even though the repository correctly fails closed without credentials.

