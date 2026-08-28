# Supported LifeStreak toolchain

LifeStreak uses one reproducible JavaScript toolchain everywhere:

- Node.js `22.22.0`
- npm `11.17.0`
- Vite `7.x`
- `@vitejs/plugin-react` `5.x`
- React and React DOM `19.x`

`.nvmrc`, `.node-version`, `package.json`, `package-lock.json`, CI, Android workflows, and Docker must agree. Run `npm run toolchain:check` before validation. `engine-strict=true` makes unsupported clean installs fail early, and `npm ci` is the only supported lockfile install. No legacy peer-dependency bypass is permitted.

Dependabot may group compatible minor and patch updates. Framework and Capacitor majors are ignored until this contract is deliberately revised and verified across web, Docker, Android, and iOS.
