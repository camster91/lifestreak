import { readFileSync } from 'node:fs';

const expected = {
  name: 'LifeStreak',
  packageName: 'lifestreak',
  appId: 'com.ashbi.lifestreak',
  version: '4.0.0',
  buildNumber: '400',
  origin: 'https://lifestreak.ashbi.ca',
};

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const failures = [];

function requireMatch(path, pattern, description, count = 1) {
  const matches = read(path).match(pattern) || [];
  if (matches.length !== count) {
    failures.push(`${path}: expected ${count} ${description}, found ${matches.length}`);
  }
}

const packageJson = JSON.parse(read('package.json'));
const capacitor = JSON.parse(read('capacitor.config.json'));

if (packageJson.name !== expected.packageName) {
  failures.push(`package.json: expected name ${expected.packageName}`);
}
if (packageJson.version !== expected.version) {
  failures.push(`package.json: expected version ${expected.version}`);
}
if (capacitor.appId !== expected.appId) {
  failures.push(`capacitor.config.json: expected appId ${expected.appId}`);
}
if (capacitor.appName !== expected.name) {
  failures.push(`capacitor.config.json: expected appName ${expected.name}`);
}

requireMatch(
  'android/app/build.gradle',
  new RegExp(`applicationId "${expected.appId.replaceAll('.', '\\.')}"`, 'g'),
  'canonical Android application ID'
);
requireMatch(
  'android/app/build.gradle',
  new RegExp(`versionName "${expected.version.replaceAll('.', '\\.')}"`, 'g'),
  'canonical Android marketing version'
);
requireMatch(
  'android/app/build.gradle',
  new RegExp(`versionCode ${expected.buildNumber}`, 'g'),
  'canonical Android version code'
);
requireMatch(
  'ios/App/App.xcodeproj/project.pbxproj',
  new RegExp(`PRODUCT_BUNDLE_IDENTIFIER = ${expected.appId.replaceAll('.', '\\.')};`, 'g'),
  'canonical iOS bundle ID',
  2
);
requireMatch(
  'ios/App/App.xcodeproj/project.pbxproj',
  new RegExp(`MARKETING_VERSION = ${expected.version.replaceAll('.', '\\.')};`, 'g'),
  'canonical iOS marketing version',
  2
);
requireMatch(
  'ios/App/App.xcodeproj/project.pbxproj',
  new RegExp(`CURRENT_PROJECT_VERSION = ${expected.buildNumber};`, 'g'),
  'canonical iOS build number',
  2
);
requireMatch(
  'android/app/src/main/res/values/strings.xml',
  new RegExp(`<string name="app_name">${expected.name}</string>`, 'g'),
  'canonical Android app name'
);
requireMatch(
  'APP_STORE_SUBMISSION.md',
  new RegExp('Bundle ID:\\*\\* `' + expected.appId.replaceAll('.', '\\.') + '`', 'g'),
  'canonical store bundle ID'
);
requireMatch(
  'docs/product-identity.md',
  new RegExp(expected.origin.replaceAll('.', '\\.'), 'g'),
  'canonical production origin',
  2
);

if (failures.length) {
  console.error('LifeStreak identity drift detected:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `LifeStreak identity verified: ${expected.appId}, version ${expected.version} (${expected.buildNumber}).`
);
