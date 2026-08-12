# LifeStreak — App Store Submission Guide

## App Details
- **Name:** LifeStreak
- **Bundle ID:** com.ashbi.lifestreak
- **Android version:** 4.0.0 (versionCode 400)
- **iOS version:** 3.0.0 (build 300; requires macOS/Xcode validation)
- **Category:** Lifestyle / Reference
- **Rating:** 4+ (no objectionable content)

## Short Description (80 chars)
Daily spiritual habits: Bible reading, meeting prep & progress tracking

## Full Description
LifeStreak helps people build consistent personal routines with private, easy-to-use tracking tools.

**Features:**
- Daily Bible reading schedule with progress tracking
- Meeting preparation tracker (Midweek & Weekend)
- Prayer & family worship tracking
- Daily spiritual goals and habits
- Weekly and monthly progress statistics
- Local notifications & reminders
- Works offline — no account required
- Dark mode support

Build consistent spiritual habits and see your progress grow over time.

---

## Android (Google Play Store)

### Prerequisites
1. Google Play Developer account ($25 one-time fee) — https://play.google.com/console
2. A release signing keystore supplied and stored outside the repository.

### Building the Release AAB
```bash
cd C:\path\to\lifestreak
npm ci
npm run build
npx cap sync android
npx cap open android
```

In Android Studio, generate a signed Android App Bundle with the separately
managed release keystore. Keep `KEYSTORE_PASSWORD` and `KEY_PASSWORD` in a
secure secret manager; never commit them or the keystore.

### Play Store Listing
- Screenshots: At least 2 phone screenshots (1080x1920 or 1080x2400)
- Feature graphic: 1024x500 PNG
- Icon: 512x512 PNG (hi-res)

### Keystore Status
The production release keystore is not present in this repository or current
Windows workspace. It must be supplied through the authorized release process.

---

## iOS (Apple App Store)

### Prerequisites
1. Apple Developer account ($99/year) — https://developer.apple.com
2. Mac with Xcode (cannot build iOS on Windows)
3. Apple ID enrolled in developer program

### Building
```bash
# On Mac:
cd /path/to/lifestreak
npm ci
npm run build
npx cap sync ios
npx cap open ios
```

Then in Xcode: Product > Archive > Distribute App.

### App Store Connect Setup
1. Create the app at https://appstoreconnect.apple.com
2. Use bundle ID `com.ashbi.lifestreak`
3. Upload a build via Xcode or Transporter
4. Fill in the metadata above
5. Submit for review

---

## Privacy Policy
Required for both stores. The app collects no personal data, stores data
locally on the device, requires no account, and has no analytics or tracking.

Hosted and browser-verified at: https://lifestreak.ashbi.ca/privacy.html

---

## Screenshots Needed
- Home screen (daily view)
- Bible reading tracker
- Statistics screen
- Meeting prep screen
- Settings/dark mode

Draft browser captures are stored under `app-store-assets/screenshots/`; they
are not a substitute for physical-device or simulator evidence. Final store
assets still require review on the target device class.
