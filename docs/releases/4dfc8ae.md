# LifeStreak release `4dfc8ae`

Date: 2026-08-17  
Environment: Ashbi VPS production (`https://lifestreak.ashbi.ca`)

## Changes

- Made More → Settings navigation immediate and reliable.
- Declared `/manifest.webmanifest` as `application/manifest+json`.

## Validation

- `npm test -- --run`: 121 tests passed.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run build`: passed.
- Ashbi Local CI: passed.
- GitGuardian: passed.
- Production smoke: passed.
- Docker health: `healthy`; restart policy: `unless-stopped`.
- Delegated live browser QA: Settings reached `/settings`, Settings content
  rendered, manifest returned HTTP 200 with the correct MIME type, and no
  console errors or warnings were observed.

## Deployment

- Image: `lifestreak:4dfc8ae194b7355607ae48d056b01195d73b9213`.
- Digest: `sha256:68a9e01a3bfc927d209dc37f9da30fc82a8491352d3e943f4bf2bcd929116efb`.
- Active route: `127.0.0.1:18095`.
- Rollback route backup:
  `/opt/traefik/dynamic/lifestreak.yml.20260817-1241-4dfc8ae.bak`.

## Remaining gates

- Physical Android installation, offline startup, notifications, and deep
  links require Android hardware or an emulator with `adb`.
- iOS archive, signing, TestFlight, and physical-device testing require
  macOS/Xcode.
- Uptime Kuma still needs an authorized administrator and notification channel;
  the credential-free VPS watchdog remains active as interim monitoring.
- Hosted Android and Docker GitHub jobs were not started because of the
  account billing/spending-limit gate; Ashbi Local CI and local gates passed.
