import { spawnSync } from 'node:child_process';
import process from 'node:process';

const gradleCommand = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const result = spawnSync(gradleCommand, process.argv.slice(2), {
  cwd: new URL('../android/', import.meta.url),
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(`Unable to start ${gradleCommand}: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
