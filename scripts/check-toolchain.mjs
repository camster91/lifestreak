const EXPECTED_NODE = '22.22.0';
const EXPECTED_NPM = '11.17.0';

const actualNode = process.versions.node;
const userAgent = process.env.npm_config_user_agent || '';
const actualNpm = /^npm\/([^ ]+)/.exec(userAgent)?.[1] || null;

const failures = [];
if (actualNode !== EXPECTED_NODE) {
  failures.push(`Node ${EXPECTED_NODE} is required; found ${actualNode}.`);
}
if (actualNpm !== EXPECTED_NPM) {
  failures.push(
    actualNpm
      ? `npm ${EXPECTED_NPM} is required; found ${actualNpm}.`
      : `Run this check through npm ${EXPECTED_NPM} (npm run toolchain:check).`
  );
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`LifeStreak toolchain verified: Node ${actualNode}, npm ${actualNpm}.`);
