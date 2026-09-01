import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const gradle = read('android/app/build.gradle');
const gitignore = read('.gitignore');
const failures = [];

for (const required of [
  "System.getenv('KEYSTORE_PASSWORD')",
  "System.getenv('KEY_PASSWORD')",
  "System.getenv('KEY_ALIAS')",
  "System.getenv('KEYSTORE_FILE')",
  'releaseStoreFile.isFile()',
  "task.name == 'assembleRelease'",
  "task.name == 'bundleRelease'",
  'throw new GradleException',
]) {
  if (!gradle.includes(required)) failures.push(`android/app/build.gradle is missing ${required}`);
}

for (const ignored of ['android/keystore.properties', '*.keystore', '*.jks']) {
  if (!gitignore.includes(ignored)) failures.push(`.gitignore does not exclude ${ignored}`);
}

const tracked = spawnSync(
  'git',
  ['ls-files', '*.keystore', '*.jks', 'android/keystore.properties'],
  {
    encoding: 'utf8',
  }
);
if (tracked.status !== 0) failures.push('Could not inspect tracked signing files.');
if (tracked.stdout.trim()) failures.push(`Signing files are tracked: ${tracked.stdout.trim()}`);

if (failures.length) {
  console.error('Android signing contract failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  'Android signing contract verified: release tasks fail closed and signing files are excluded.'
);
