import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const failures = [];

const infoPlist = read('ios/App/App/Info.plist');
const androidManifest = read('android/app/src/main/AndroidManifest.xml');
const packageJson = JSON.parse(read('package.json'));
const capacitor = JSON.parse(read('capacitor.config.json'));

for (const forbidden of [
  'NSCalendarsUsageDescription',
  'NSUserTrackingUsageDescription',
  'NSContactsUsageDescription',
  'NSLocationWhenInUseUsageDescription',
  'NSCameraUsageDescription',
  'NSMicrophoneUsageDescription',
]) {
  if (infoPlist.includes(forbidden)) failures.push(`Info.plist declares unused ${forbidden}`);
}

if (packageJson.dependencies?.['@capacitor/push-notifications']) {
  failures.push('package.json includes remote Push Notifications without an approved feature');
}
if (capacitor.plugins?.PushNotifications) {
  failures.push('capacitor.config.json configures remote Push Notifications');
}

const declaredAndroidPermissions = [
  ...androidManifest.matchAll(/<uses-permission android:name="([^"]+)"/g),
].map((match) => match[1]);
const expectedAndroidPermissions = new Set([
  'android.permission.INTERNET',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.SCHEDULE_EXACT_ALARM',
]);

for (const permission of declaredAndroidPermissions) {
  if (!expectedAndroidPermissions.has(permission)) {
    failures.push(`AndroidManifest.xml declares unreviewed permission ${permission}`);
  }
}
for (const permission of expectedAndroidPermissions) {
  if (!declaredAndroidPermissions.includes(permission)) {
    failures.push(`AndroidManifest.xml is missing documented permission ${permission}`);
  }
}

if (failures.length) {
  console.error('LifeStreak permission drift detected:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('LifeStreak permissions verified: local notifications and internet only.');
