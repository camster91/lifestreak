# Supported LifeStreak toolchain

LifeStreak uses one reproducible JavaScript toolchain everywhere:

- Node.js `22.22.0`
- npm `11.17.0`
- Vite `7.x`
- `@vitejs/plugin-react` `5.x`
- React and React DOM `19.x`

`.nvmrc`, `.node-version`, `package.json`, `package-lock.json`, CI, Android workflows, and Docker must agree. Run `npm run toolchain:check` before validation. `engine-strict=true` makes unsupported clean installs fail early, and `npm ci` is the only supported lockfile install. No legacy peer-dependency bypass is permitted.

Dependabot may group compatible minor and patch updates. Framework and Capacitor majors are ignored until this contract is deliberately revised and verified across web, Docker, Android, and iOS.

## Local clean-install evidence

On 2026-08-28, macOS validation used an isolated Node `22.22.0` executable with npm `11.17.0` to run `npm ci` without peer-dependency bypasses. The clean install added 696 packages without changing `package-lock.json`, then passed the exact-toolchain check, formatting, typecheck, lint, 31 files / 281 tests, production build, responsive/accessibility Chromium matrix, repository contracts, zero-vulnerability audit, and Android/iOS Capacitor sync. Android/iOS compilation and hosted clean installs remain separate required evidence.

npm install-script policy is explicit and reviewable: `esbuild@0.27.2` is approved at that exact version for its platform-binary verification/setup, while optional `fsevents` install scripts are denied. The supply-chain check fails if a future lockfile introduces an uncovered install script or an unpinned positive approval.
