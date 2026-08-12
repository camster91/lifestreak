# LifeStreak - App Store Submission TODO

## 🔴 Critical Blockers (Must Fix)

### iOS App Store
- [x] Normalize app name and bundle identifiers to LifeStreak
- [x] Update required device capability from `armv7` to `arm64`
- [x] Set iOS marketing/build versions to 3.0.0/300 in the project
- [x] Add NSCalendarsUsageDescription permission string
- [x] Add NSUserTrackingUsageDescription permission string

### Android Google Play
- [ ] Create and securely back up a release keystore outside Git
- [x] Configure `build.gradle` to require release signing credentials
- [x] Release builds fail closed when production signing credentials are absent; they do not fall back to debug signing
- [x] Set versionCode 400 and versionName 4.0.0

## 🟡 App Store Assets Needed

### iOS (App Store Connect)
- [ ] App icon (1024x1024 PNG, no transparency) - ✓ EXISTS, verify it meets guidelines
- [ ] Screenshots (required sizes):
  - [ ] iPhone 6.7" (1290x2796)
  - [ ] iPhone 6.5" (1242x2688) 
  - [ ] iPhone 5.5" (1242x2208)
  - [ ] iPad Pro 12.9" (2048x2732)
- [ ] App preview video (optional but recommended)
- [ ] Promotional text (170 chars max)
- [ ] Description (4000 chars max)
- [ ] Keywords (100 chars max)
- [ ] Support URL
- [ ] Marketing URL (optional)

### Android (Google Play Console)
- [ ] App icon (512x512 PNG) - check existing
- [ ] Feature graphic (1024x500 PNG)
- [ ] Screenshots (minimum 2, maximum 8):
  - [ ] Phone (1080x1920 or 1080x2340)
  - [ ] 7" Tablet (1200x1920)
  - [ ] 10" Tablet (1600x2560)
- [ ] Short description (80 chars max)
- [ ] Full description (4000 chars max)

## 🟢 Pre-Submission Checks

### Both Platforms
- [ ] Test on physical devices (not just simulators) - see `docs/mobile-qa.md`; hardware is not available in this workspace
- [ ] Verify app works offline
- [ ] Check dark mode support
- [ ] Test push notifications
- [ ] Verify deep links work
- [ ] Test on different screen sizes
- [ ] Run accessibility audit
- [ ] Check for memory leaks
- [ ] Verify app doesn't crash on launch

### iOS Specific
- [ ] Archive build succeeds in Xcode
- [ ] Validate app passes App Store validation
- [ ] TestFlight internal testing
- [ ] Check for deprecated API usage

### Android Specific
- [x] Build debug APK for integration validation
- [ ] Build signed release APK/AAB after the external keystore is supplied
- [ ] Test on multiple Android versions
- [ ] Check for permission requests
- [ ] Verify ProGuard/R8 minification works

## 🔵 Store Listing Content

### Required for Both
- [x] Privacy policy URL (`https://lifestreak.ashbi.ca/privacy.html`)
- [ ] Contact email
- [ ] App category (Lifestyle / Religion)
- [ ] Content rating questionnaire

### iOS Specific
- [ ] App Store privacy details (data collection disclosures)
- [ ] App Clip configuration (optional)

### Android Specific
- [ ] Target audience selection
- [ ] News app declaration (if applicable)

## 🟣 Developer Accounts

- [ ] Apple Developer Program enrollment ($99/year) - verify active
- [ ] Google Play Developer account ($25 one-time) - verify active
- [ ] Access to App Store Connect
- [ ] Access to Google Play Console

---

## Current Status

| Platform | Status | Blockers |
|----------|--------|----------|
| iOS | 🟡 In Progress | App name fix, screenshots, device testing |
| Android | 🟡 In Progress | Release keystore, physical-device QA, screenshots |

## Notes

- Bundle ID: `com.ashbi.lifestreak`
- Current iOS version in `ios/App/App.xcodeproj/project.pbxproj`: 3.0.0 (build 300)
- App uses Capacitor for native bridge
- Has push notification setup (Firebase)
