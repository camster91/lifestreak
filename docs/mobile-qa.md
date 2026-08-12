# LifeStreak mobile QA evidence

## Verified in this workspace

- `npx cap sync android` completed and added the installed Capacitor Browser plugin to the Android project.
- `cd android && gradlew.bat --no-daemon --console=plain assembleDebug` completed successfully on 2026-08-12.
- Artifact: `android/app/build/outputs/apk/debug/app-debug.apk` (debug-signed, local artifact only).
- Java: 21.0.9; Gradle: 8.14.3; Android project application ID: `com.ashbi.lifestreak`.
- No `adb` or Android emulator is available in this workspace, so APK installation and runtime device behavior are not verified here.
- iOS archive/TestFlight cannot be verified on Windows because Xcode and a macOS signing environment are required.

## Required before store submission

- Supply and back up a real Android release keystore outside Git, then build and inspect a signed AAB.
- Install the signed Android build on physical Android hardware and test offline startup, dark mode, notifications, deep links, multiple screen sizes, and data import/export.
- Archive and validate the iOS build on macOS, then run TestFlight and physical-device QA.
- Capture store screenshots from approved device/emulator profiles.
