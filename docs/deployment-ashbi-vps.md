# LifeStreak deployment on Ashbi VPS

This is the runbook for the manually managed static deployment at `https://lifestreak.ashbi.ca`.

## Active product status

LifeStreak is an independent active product. `lifestreak.ashbi.ca` must continue
to serve LifeStreak and must not redirect to JW Companion. The old successor
guard remains only as historical evidence from the abandoned consolidation
attempt; it is not part of the current release procedure.

Changes to the hostname or route require a separate explicit production
decision, a timestamped backup of `/opt/traefik/dynamic/lifestreak.yml`, public
verification, and a tested rollback. Never redirect the hostname merely because
another application is reachable: doing so would break installed-app behavior
and access to existing local-only LifeStreak data.

### Historical 2026-08-14 cutover attempt

The JW Companion origin was started and verified locally on port 8001. The
Cloudflare tunnel briefly obtained a connector and the successor guard passed,
but the public tunnel then became unstable and returned intermittent 502/530
responses. A temporary Traefik redirect was tested, failed end-to-end against
that unstable successor, and was immediately rolled back. LifeStreak remains
the active legacy deployment until the successor is externally reachable and
its own release verification passes.

The redirect was abandoned when LifeStreak was restored as its own product. Do
not retry it under the current product contract.

### 2026-09-01 LifeStreak release

Commit `b7d4420c83fd6b43db2db6081f25195fac53b5c0` is deployed and serving
`https://lifestreak.ashbi.ca`. The active container is
`lifestreak-b7d4420c83fd6b43db2db6081f25195fac53b5c0`, using immutable local
image digest `sha256:593922b718eed22e984539a1664b179f5ae3298d68a5a926145ed036eb419572`.
Traefik routes to `127.0.0.1:18099`; the pre-cutover route backup is
`/opt/traefik/dynamic/lifestreak.yml.20260901T104132Z-68f0270.bak`.

The previous `68f02702b2bfdf64d8867d5f4c175056811b553d` container remains healthy
on `127.0.0.1:18097` as the immediate rollback target. The exact release source
passed the full source gate, multi-architecture image publish, and high/critical
vulnerability scan in GitHub Actions run `33498097064`. Candidate and public
checks confirmed Docker health, release identity, document/manifest/service
worker endpoints, and security headers.

### Historical 2026-08-17 LifeStreak releases

Commit `78f38a50cda8df8c60a5c3b59acdd401ce27d172` is deployed and serving
`https://lifestreak.ashbi.ca`. The active container is
`lifestreak-78f38a50cda8df8c60a5c3b59acdd401ce27d172`, using image
`lifestreak:78f38a50cda8df8c60a5c3b59acdd401ce27d172`.
Traefik routes to `127.0.0.1:18096`; the route backup is
`/opt/traefik/dynamic/lifestreak.yml.20260817-1930-78f38a5.bak`.

The candidate reported Docker health `healthy` with restart policy
`unless-stopped`. Production smoke passed, and delegated live browser QA
confirmed that Home → More → Settings reaches `/settings` with no console
errors. The manifest returned HTTP 200 with
`Content-Type: application/manifest+json`.
Repository metadata paths `/.git/` and `/.git/config` return HTTP 404 rather
than the SPA fallback.

## Release procedure

1. Confirm the working tree is clean, the target commit is pushed, and the local gates pass:
   `npm ci`, `npm test`, `npm run lint`, `npm run format:check`, and `npm run build`.
2. Create a source archive from the exact commit and copy it to the VPS using binary-safe SCP (`scp -O`). Do not copy `node_modules` or `dist`.
3. Build an immutable image on the VPS and embed the full source revision:
   `docker build --build-arg LIFESTREAK_BUILD_REVISION=<40-character-commit> -t lifestreak:<commit> /opt/lifestreak-src-<commit>`.
4. Start the candidate on a new loopback port, for example `127.0.0.1:18082`, and verify it locally before changing Traefik. Check `/`, `/manifest.webmanifest`, `/sw.js`, and confirm `/version.json` contains the exact candidate commit. Record the image digest; mutable tags are not deployment evidence.
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

After restoring an older image, `/version.json` must identify the prior commit. Do not roll back local databases or clear browser storage: the habit schema and specialist migrations are forward-compatible and the previous app must leave unknown/newer local records untouched rather than rewriting them.

## Emergency service-worker disable

Use this only when a broken worker prevents the normal waiting-worker update or rollback:

1. Preserve the current route and image as evidence. Copy `ops/emergency-disable-sw.js` to the active origin as `/sw.js` with JavaScript content type, `Cache-Control: no-store`, and service-worker scope `/`.
2. Verify the emergency worker content by digest before exposing it. It activates immediately, deletes LifeStreak Cache Storage entries, unregisters itself, and reloads controlled windows. It does **not** clear localStorage or IndexedDB.
3. Confirm a previously controlled browser becomes uncontrolled after reload and that its local habit/Collections records remain byte-identical.
4. Deploy or restore a verified immutable LifeStreak image, remove the emergency override, load twice online so the normal worker installs, then repeat the offline smoke.
5. Record timestamps, emergency-script digest, affected revision, preserved-data comparison, and final deployed revision. A real production use requires incident review; do not treat cache deletion as ordinary update behavior.

## Monitoring

The repository now includes a scheduled GitHub Actions smoke check (`.github/workflows/production-smoke.yml`) that runs hourly and can also be dispatched manually. An independent Uptime Kuma monitor is not configured for this hostname yet. The minimum monitor should check HTTPS 200, the LifeStreak title, the manifest JSON name, and response headers; alert on two consecutive failures. Container logs and `docker inspect` provide local health evidence but are not an independent monitor.

The Ashbi VPS currently has Uptime Kuma installed at loopback port `3052`, but
its UI is still on the first-run `/setup` screen. Completing independent
alerting requires an authorized operator to create the Uptime Kuma admin
account, add `https://lifestreak.ashbi.ca/` as an HTTP monitor, and choose an
alert notification channel. Do not create credentials in deployment scripts.

As a credential-free interim layer, the VPS now runs
`/usr/local/bin/lifestreak-monitor.sh` from `/etc/cron.d/lifestreak-monitor`
every five minutes. It checks the public HTTPS status, LifeStreak title, PWA
manifest identity, and required security headers; failures are written to
`/var/log/lifestreak-monitor.log` and syslog. `flock` prevents overlapping
checks. This watchdog records failures but does not replace Uptime Kuma’s
notification channel.

Each new LifeStreak image now also exposes a Docker health check that fetches
the local document and requires the `LifeStreak` title. Verify it with:

```bash
docker inspect --format '{{json .State.Health}}' lifestreak-<commit>
```
