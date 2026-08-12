# LifeStreak deployment on Ashbi VPS

This is the runbook for the manually managed static deployment at `https://lifestreak.ashbi.ca`.

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

The VPS currently has no external uptime monitor configured for this hostname. Until one is added, run the smoke check after every release and from a scheduled external runner. The minimum monitor should check HTTPS 200, the LifeStreak title, the manifest JSON name, and response headers; alert on two consecutive failures. Container logs and `docker inspect` provide local health evidence but are not an independent monitor.
