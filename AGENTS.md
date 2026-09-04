# AGENTS.md

LifeStreak is a private, local-first React, Vite, and Capacitor application. Read `README.md` first, then `docs/product-control.md` for current product authority, `docs/product-identity.md` for release identity, and `docs/ISSUE_ROADMAP.md` for prioritized work. Historical plans are not current requirements unless a canonical document links to them.

## Local workflow

- Use Node.js 22.22.0 and npm 11.17.0 exactly. The contract is pinned in `.nvmrc` and `package.json`.
- Run `npm run setup` after selecting the pinned toolchain.
- Run the complete portable gate with `npm run verify` before requesting review.
- Run `npm start` when work requires both Vite and the local API; `npm run dev` is frontend-only.
- Normal local-first web development requires no environment variables. Do not add an environment template unless a real configuration dependency is introduced.

## Data and product boundaries

- Preserve local data, versioned storage keys, effective-dated history, and legacy Collections compatibility.
- Never reinterpret, migrate, clear, or reset existing user data without an explicit migration, tests, recovery path, and approval.
- Habit names remain private in notification surfaces by default. Permission prompts must remain deliberate user actions.
- Keep the general-purpose product identity; spiritual routines are optional templates rather than the entire product.

## Mobile and release boundaries

- Capacitor-generated changes must be reproducible from committed web and configuration sources.
- CI performs additional advisory, secret, configuration, signing, and native-shell drift gates beyond `npm run verify`.
- Do not merge, publish mobile builds, change signing material, deploy, or alter release status without explicit approval.
