# LifeStreak deployment on Ashbi VPS

This is the runbook for the manually managed static deployment at `https://lifestreak.ashbi.ca`.

## Archive status

The source repository was archived and consolidated into
[`camster91/jw-companion`](https://github.com/camster91/jw-companion) on
2026-08-13. The canonical JW Companion repository documents its public
deployment at `https://jw.cstack67.win/` on a separate Windows/Cloudflare
Tunnel environment. The legacy hostname still serves the last verified
LifeStreak deployment; redirecting or decommissioning that hostname is
intentionally a separate production decision because it would change access to
existing local-only LifeStreak data.

At the time of this audit, `jw.cstack67.win` returned Cloudflare 530 / error
1033. The local JW Companion scheduled tasks were present but not running, and
port 8001 had no listener. Do not redirect the legacy hostname until the
successor is externally reachable and its own release verification passes.

Before any redirect, run the repository guard from PowerShell:

```powershell
./scripts/check-successor.ps1
```

Only after that check passes should an operator create a timestamped backup of
`/opt/traefik/dynamic/lifestreak.yml`, change the route to the approved
successor, verify the public URL, and retain the prior route for rollback. If
the check fails, leave the LifeStreak route unchanged.

## Release procedure

1. Confirm the working tree is clean, the target commit is pushed, and the local gates pass:
   `npm ci`, `npm test`, `npm run lint`, `npm run format:check`, and `npm run build`.
2. Create a source archive from the exact commit and copy it to the VPS using binary-safe SCP (`scp -O`). Do not copy `node_modules` or `dist`.
3. Build an immutable image on the VPS:
   `docker build -t lifestreak:<commit> /opt/lifestreak-src-<commit>`.
4. Start the candidate on a new loopback port, for example `127.0.0.1:18082`, and verify it locally before changing Traefik:
   `curl -fsSI http://127.0.0.1:18082/`.
5. Update `/opt/traefik/dynamic/lifestreak.yml` to the candidate port. Copy the existing route to a timestamped `.bak` file before changing it, then check Traefik logs for configuration errors.
6. Verify the public URL with the smoke script and inspect the candidate container logs. Keep the previous container and image until the release has passed its observation window.

The existing route is deliberately kept in its own dynamic file so unrelated Ashbi services are not changed during a LifeStreak release.

## Production smoke checks

From PowerShell:

```powershell
./scripts/smoke-production.ps1
```

The check validates HTTPS status, the LifeStreak document title, the PWA manifest, and the security headers. It does not replace interactive browser or physical-device QA.

## Rollback

1. Point `/opt/traefik/dynamic/lifestreak.yml` back to the prior loopback port or restore the timestamped route backup.
2. Confirm `https://lifestreak.ashbi.ca` returns HTTP 200 and the expected LifeStreak title.
3. Keep the failed candidate stopped for investigation; do not delete the prior image or container until the rollback is confirmed.
4. Record the deployed image tag, image digest, route backup path, and verification result in the release notes.

## Monitoring

The repository now includes a scheduled GitHub Actions smoke check (`.github/workflows/production-smoke.yml`) that runs hourly and can also be dispatched manually. An independent Uptime Kuma monitor is not configured for this hostname yet. The minimum monitor should check HTTPS 200, the LifeStreak title, the manifest JSON name, and response headers; alert on two consecutive failures. Container logs and `docker inspect` provide local health evidence but are not an independent monitor.

The Ashbi VPS currently has Uptime Kuma installed at loopback port `3052`, but
its UI is still on the first-run `/setup` screen. Completing independent
alerting requires an authorized operator to create the Uptime Kuma admin
account, add `https://lifestreak.ashbi.ca/` as an HTTP monitor, and choose an
alert notification channel. Do not create credentials in deployment scripts.

Each new LifeStreak image now also exposes a Docker health check that fetches
the local document and requires the `LifeStreak` title. Verify it with:

```bash
docker inspect --format '{{json .State.Health}}' lifestreak-<commit>
```
