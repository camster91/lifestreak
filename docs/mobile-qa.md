# LifeStreak mobile QA evidence

## Verified in this workspace

- `npx cap sync android` completed and added the installed Capacitor Browser plugin to the Android project.
- `cd android && gradlew.bat --no-daemon --console=plain assembleDebug` completed successfully on 2026-08-12.
- `node scripts/run-gradle.js --no-daemon --console=plain assembleDebug` completed successfully on 2026-08-14; the wrapper now selects `gradlew.bat` on Windows and `./gradlew` on Unix-like CI hosts.
- `node scripts/run-gradle.js --no-daemon --console=plain lint` completed successfully on 2026-08-14 with no new Android lint issues.
- Artifact: `android/app/build/outputs/apk/debug/app-debug.apk` (debug-signed, local artifact only).
- Java: 21.0.9; Gradle: 8.14.3; Android project application ID: `com.ashbi.lifestreak`.
- No `adb` or Android emulator is available in this workspace, so APK installation and runtime device behavior are not verified here.
- The repository now defines an unsigned macOS PR compile and a protected signed iOS archive/export workflow. They remain unverified until GitHub jobs execute on an available macOS runner with the protected production environment configured.

## Required before store submission

- Supply and back up a real Android release keystore outside Git, then build and inspect a signed AAB.
- Install the signed Android build on physical Android hardware and test offline startup, dark mode, notifications, deep links, multiple screen sizes, and data import/export.
- Archive and validate the iOS build on macOS, then run TestFlight and physical-device QA.
- Capture store screenshots from approved device/emulator profiles.

Signed AAB/IPA workflows emit the exact artifact, SHA-256 file, commit/version/build/runner metadata, and a GitHub provenance attestation with 30-day artifact retention. Follow [android-signing.md](android-signing.md) and [ios-signing.md](ios-signing.md); public store promotion is never automatic.
