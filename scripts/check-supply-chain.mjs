import { readFileSync, readdirSync } from 'node:fs';

const workflowDirectory = new URL('../.github/workflows/', import.meta.url);
const failures = [];

for (const name of readdirSync(workflowDirectory).filter((file) => /\.ya?ml$/.test(file))) {
  const source = readFileSync(new URL(name, workflowDirectory), 'utf8');
  for (const [index, line] of source.split('\n').entries()) {
    const match = line.match(/uses:\s*([^\s#]+)/);
    if (!match || match[1].startsWith('./')) continue;
    if (!/@[0-9a-f]{40}$/.test(match[1])) {
      failures.push(`${name}:${index + 1} action is not pinned to a full commit SHA`);
    }
    if (!/#\s*v[0-9]/.test(line)) {
      failures.push(`${name}:${index + 1} pinned action needs a readable version comment`);
    }
  }
  const jobsIndex = source.search(/^jobs:/m);
  const permissionsIndex = source.search(/^permissions:\n\s+contents:\s+read/m);
  if (permissionsIndex < 0 || (jobsIndex >= 0 && permissionsIndex > jobsIndex)) {
    failures.push(`${name} must default the workflow token to contents: read before jobs`);
  }
  if (/pull_request_target\s*:/.test(source)) {
    failures.push(`${name} uses pull_request_target, which is forbidden for untrusted changes`);
  }
  if (/pull_request\s*:/.test(source) && /secrets\.[A-Za-z0-9_]+/.test(source)) {
    failures.push(`${name} exposes a named secret in a pull-request workflow`);
  }
}

const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
for (const [index, line] of dockerfile.split('\n').entries()) {
  if (/^FROM\s+/i.test(line) && !/@sha256:[0-9a-f]{64}(?:\s|$)/.test(line)) {
    failures.push(`Dockerfile:${index + 1} base image is not pinned to a SHA-256 digest`);
  }
}

const dependabot = readFileSync(new URL('../.github/dependabot.yml', import.meta.url), 'utf8');
for (const ecosystem of ['npm', 'github-actions', 'docker']) {
  if (!dependabot.includes(`package-ecosystem: '${ecosystem}'`)) {
    failures.push(`Dependabot does not cover ${ecosystem}`);
  }
}

const lockfile = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const packageManifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);
const installScriptPolicy = packageManifest.allowScripts || {};
for (const [path, dependency] of Object.entries(lockfile.packages || {})) {
  if (!path || !dependency.hasInstallScript) continue;
  const packageName = path.split('node_modules/').at(-1);
  const pinnedPolicy = `${packageName}@${dependency.version}`;
  if (!(pinnedPolicy in installScriptPolicy) && !(packageName in installScriptPolicy)) {
    failures.push(`${path} has an unreviewed install script`);
  }
  if (installScriptPolicy[packageName] === true) {
    failures.push(`${packageName} install-script approval must be pinned to an exact version`);
  }
}
const approvedLicenses = new Set([
  '0BSD',
  'Apache-2.0',
  'Apache-2.0 AND LGPL-3.0-or-later',
  'Apache-2.0 AND LGPL-3.0-or-later AND MIT',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BlueOak-1.0.0',
  'CC-BY-4.0',
  'CC0-1.0',
  'ISC',
  'LGPL-3.0-or-later',
  'MIT',
  'MIT-0',
  'MPL-2.0',
  'Unlicense',
  '(MIT OR CC0-1.0)',
]);
for (const [path, dependency] of Object.entries(lockfile.packages || {})) {
  if (!path || approvedLicenses.has(dependency.license)) continue;
  failures.push(`${path} has an unreviewed or missing license: ${dependency.license || 'missing'}`);
}

for (const name of ['android-release.yml', 'ios-release.yml', 'build-and-push.yml']) {
  const source = readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8');
  if (!/attest-build-provenance|provenance:\s*true/.test(source)) {
    failures.push(`${name} must retain provenance attestation`);
  }
}

if (failures.length) {
  console.error(`Supply-chain contract failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(
  'Supply-chain contract verified: immutable inputs, reviewed install scripts, read-only defaults, trusted PRs, update coverage, and provenance.'
);
